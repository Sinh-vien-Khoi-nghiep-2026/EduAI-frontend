import { expect, test } from "bun:test";
import type { Skill } from "@/api/arbor";
import {
  buildSkillTree,
  countSkills,
  descendantIds,
  parentOptionsFor,
  validateSkillPath,
  validateStableId,
  visibleRows,
} from "./taxonomy";

const skill = (id: string, stableId: string, name: string, parentId: string | null = null, path = ""): Skill => ({
  id,
  stable_id: stableId,
  name,
  parent_id: parentId,
  path,
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

test("descendantIds returns transitive children, empty for a leaf, and terminates on malformed cyclic input", () => {
  const tree = [
    skill("1", "root", "Root"),
    skill("2", "child", "Child", "1"),
    skill("3", "grandchild", "Grandchild", "2"),
    skill("4", "other", "Other"),
  ];
  expect(descendantIds(tree, "1")).toEqual(new Set(["2", "3"]));
  expect(descendantIds(tree, "2")).toEqual(new Set(["3"]));
  expect(descendantIds(tree, "3")).toEqual(new Set());
  expect(descendantIds(tree, "4")).toEqual(new Set());

  const cyclic = [
    skill("a", "a", "A", "b"),
    skill("b", "b", "B", "a"),
    skill("c", "c", "C", "b"),
  ];
  expect(descendantIds(cyclic, "a")).toEqual(new Set(["b", "a", "c"]));
  expect(descendantIds([skill("x", "x", "X", "x")], "x")).toEqual(new Set(["x"]));
});

test("parentOptionsFor excludes self and all descendants, includes unrelated skills, returns all skills when id is null", () => {
  const tree = [
    skill("1", "root", "Root"),
    skill("2", "child", "Child", "1"),
    skill("3", "grandchild", "Grandchild", "2"),
    skill("4", "unrelated", "Unrelated"),
  ];
  expect(parentOptionsFor(tree, null).map(s => s.id)).toEqual(["2", "3", "1", "4"]);
  expect(parentOptionsFor(tree, "1").map(s => s.id)).toEqual(["4"]);
  expect(parentOptionsFor(tree, "2").map(s => s.id)).toEqual(["1", "4"]);
  expect(parentOptionsFor(tree, "3").map(s => s.id)).toEqual(["2", "1", "4"]);
});

test("visibleRows hides children of a collapsed node but keeps the node itself visible", () => {
  const rows = buildSkillTree(sample);
  expect(rows.map(r => r.stable_id)).toEqual(["languages", "python", "typescript", "react"]);
  expect(visibleRows(rows, new Set(["1"])).map(r => r.stable_id)).toEqual(["languages", "typescript", "react"]);
  expect(visibleRows(rows, new Set(["1", "3"])).map(r => r.stable_id)).toEqual(["languages", "typescript"]);
  expect(visibleRows(rows, new Set(["4"])).map(r => r.stable_id)).toEqual(["languages", "python", "typescript", "react"]);
  expect(visibleRows(rows, new Set())).toEqual(rows);
});

test("an active search query reveals matches inside collapsed branches and collapse resumes when cleared", () => {
  // Three levels: root -> child -> grandchild, so the match sits two levels
  // below the collapsed ancestor.
  const deep = [
    skill("r", "languages", "Languages"),
    skill("c", "web", "Web", "r"),
    skill("g", "react", "React", "c"),
    skill("o", "databases", "Databases"),
  ];
  const collapsed = new Set(["r"]);

  const unfiltered = buildSkillTree(deep, "");
  expect(visibleRows(unfiltered, collapsed, "").map(r => r.stable_id)).toEqual(["databases", "languages"]);

  const filtered = buildSkillTree(deep, "react");
  expect(filtered.map(r => r.stable_id)).toEqual(["languages", "web", "react"]);
  expect(visibleRows(filtered, collapsed, "react").map(r => r.stable_id)).toEqual([
    "languages",
    "web",
    "react",
  ]);

  // Collapse state itself was never mutated, so clearing the query hides it again.
  expect(visibleRows(buildSkillTree(deep, ""), collapsed, "").map(r => r.stable_id)).toEqual([
    "databases",
    "languages",
  ]);
  expect(visibleRows(filtered, collapsed, "   ")).toEqual(visibleRows(filtered, collapsed));
});
