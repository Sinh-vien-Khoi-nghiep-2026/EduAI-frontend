import type { Skill } from "@/api/arbor";

export type SkillNode = Skill & { depth: number; children: SkillNode[] };

/** Backend `SkillCreate` regex and the safety rules from `create_skill`. */
export const STABLE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export function validateStableId(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "A stable ID is required.";
  if (trimmed.length > 150) return "Stable ID must be 150 characters or fewer.";
  if (!STABLE_ID_PATTERN.test(trimmed)) {
    return "Use lowercase letters, digits, dots, underscores, or hyphens, starting with a letter or digit.";
  }
  return undefined;
}

export function validateSkillPath(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length > 500) return "Path must be 500 characters or fewer.";
  if (trimmed.includes("//")) return "Path cannot contain empty segments.";
  if (trimmed.split("/").some(segment => segment === "." || segment === "..")) {
    return "Path cannot contain “.” or “..” segments.";
  }
  return undefined;
}

/**
 * GET /skills returns a flat list with only `parent_id`; the API exposes no
 * `path`, so the hierarchy shown in the console is built from parents and is
 * labelled by stable ID.
 */
export function buildSkillTree(skills: Skill[], query = ""): SkillNode[] {
  const needle = query.trim().toLowerCase();
  const byId = new Map<string, SkillNode>();
  for (const skill of skills) byId.set(skill.id, { ...skill, depth: 0, children: [] });

  const roots: SkillNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    // Unknown parents (stale parent_id) are surfaced as roots, never dropped.
    (parent ? parent.children : roots).push(node);
  }

  if (!needle) {
    const flattened: SkillNode[] = [];
    const walk = (node: SkillNode, depth: number) => {
      flattened.push({ ...node, depth });
      for (const child of [...node.children].sort(byName)) walk(child, depth + 1);
    };
    for (const root of [...roots].sort(byName)) walk(root, 0);
    return flattened;
  }

  // Filtering keeps matching skills plus the ancestors that give them context.
  const keep = new Set<string>();
  for (const node of byId.values()) {
    if (!node.name.toLowerCase().includes(needle) && !node.stable_id.toLowerCase().includes(needle)) {
      continue;
    }
    keep.add(node.id);
    let parentId = node.parent_id;
    while (parentId && byId.has(parentId) && !keep.has(parentId)) {
      keep.add(parentId);
      parentId = byId.get(parentId)?.parent_id ?? null;
    }
  }
  const flattened: SkillNode[] = [];
  const walk = (node: SkillNode, depth: number) => {
    if (!keep.has(node.id)) return;
    flattened.push({ ...node, depth });
    for (const child of [...node.children].sort(byName)) walk(child, depth + 1);
  };
  for (const root of [...roots].sort(byName)) walk(root, 0);
  return flattened;
}

export function countSkills(skills: Skill[]): { total: number; roots: number } {
  const ids = new Set(skills.map(skill => skill.id));
  return {
    total: skills.length,
    roots: skills.filter(skill => !skill.parent_id || !ids.has(skill.parent_id)).length,
  };
}

function byName(a: Skill, b: Skill) {
  return a.name.localeCompare(b.name) || a.stable_id.localeCompare(b.stable_id);
}
