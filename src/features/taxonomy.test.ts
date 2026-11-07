import { expect, test } from "bun:test";
import type { Skill } from "@/api/arbor";
import { buildSkillTree, countSkills, validateSkillPath, validateStableId } from "./taxonomy";

const skill = (id: string, stableId: string, name: string, parentId: string | null = null): Skill => ({
  id,
  stable_id: stableId,
  name,
  parent_id: parentId,
});

const sample = [
  skill("3", "typescript", "TypeScript"),
  skill("1", "languages", "Languages"),
  skill("2", "python", "Python", "1"),
  skill("4", "react", "React", "3"),
];

test("tree nests children under parents and orders siblings by name", () => {
  const rows = buildSkillTree(sample);
  expect(rows.map(row => [row.stable_id, row.depth])).toEqual([
    ["languages", 0],
    ["python", 1],
    ["typescript", 0],
    ["react", 1],
  ]);
});

test("skills with an unknown parent stay visible as roots", () => {
  const rows = buildSkillTree([skill("x", "orphan", "Orphan", "missing")]);
  expect(rows.map(row => row.stable_id)).toEqual(["orphan"]);
  expect(rows[0]?.depth).toBe(0);
});

test("filtering keeps matching skills and their ancestors", () => {
  const rows = buildSkillTree(sample, "react");
  expect(rows.map(row => [row.stable_id, row.depth])).toEqual([
    ["typescript", 0],
    ["react", 1],
  ]);
});

test("filter matches stable IDs and is case-insensitive", () => {
  expect(buildSkillTree(sample, "PYTHON").map(row => row.stable_id)).toEqual(["languages", "python"]);
});

test("filter with no match returns nothing", () => {
  expect(buildSkillTree(sample, "cobol")).toHaveLength(0);
});

test("cycles cannot recurse forever", () => {
  const rows = buildSkillTree([skill("a", "a", "A", "b"), skill("b", "b", "B", "a")]);
  expect(rows).toHaveLength(0);
});

test("counts distinguish total skills from root nodes", () => {
  expect(countSkills(sample)).toEqual({ total: 4, roots: 2 });
  expect(countSkills([])).toEqual({ total: 0, roots: 0 });
});

test("stable ID validation mirrors the backend regex and limits", () => {
  expect(validateStableId("typescript.react-2_x")).toBeUndefined();
  expect(validateStableId("9lives")).toBeUndefined();
  for (const bad of ["", "  ", "TypeScript", "-lead", ".dot", "_underscore", "space in", "a".repeat(151)]) {
    expect(validateStableId(bad)).toBeString();
  }
  expect(validateStableId("a".repeat(150))).toBeUndefined();
});

test("path validation rejects the unsafe shapes the backend rejects", () => {
  expect(validateSkillPath("")).toBeUndefined();
  expect(validateSkillPath("languages/typescript")).toBeUndefined();
  expect(validateSkillPath("a//b")).toBeString();
  expect(validateSkillPath("a/./b")).toBeString();
  expect(validateSkillPath("../escape")).toBeString();
  expect(validateSkillPath("x".repeat(501))).toBeString();
});
