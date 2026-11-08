import { expect, test } from "bun:test";
import { criterionFrom, isStaleResult, pageFor, submitSearch, type SearchFilters } from "./candidate-search";

function makeFilters(): SearchFilters {
  return { organization_id: "company-id", school_id: "school-id", match: "all", skills: [{ skill_id: "typescript", min_level: 7 }], verified_only: true, require_shared_project: true };
}

test("candidate search snapshots filters and preserves them across pages", () => {
  const draft = makeFilters();
  const first = submitSearch(draft);
  draft.skills[0]!.min_level = 1;
  const second = pageFor(first, 2);
  expect(first).toMatchObject({ school_id: "school-id", page: 1, page_size: 20, skills: [{ skill_id: "typescript", min_level: 7 }] });
  expect(second).toMatchObject({ school_id: "school-id", page: 2, page_size: 20, skills: [{ skill_id: "typescript", min_level: 7 }] });
  expect(second.skills).not.toBe(first.skills);
});

test("candidate criteria reject invalid levels, duplicates, and backend-limit overflow", () => {
  for (const level of ["", "nope", "-1", "11", "2.5"]) {
    expect(() => criterionFrom("typescript", level, [])).toThrow("whole number");
  }
  expect(() => criterionFrom("typescript", "7", [{ skill_id: "typescript", min_level: 5 }])).toThrow("already");
  const fifty = Array.from({ length: 50 }, (_, index) => ({ skill_id: `skill-${index}`, min_level: 1 }));
  expect(() => criterionFrom("next", "1", fifty)).toThrow("at most 50");
  expect(() => pageFor(submitSearch(makeFilters()), 0)).toThrow("positive whole number");
});

test("empty skills are accepted by submitSearch and produce valid request body with skills: []", () => {
  const noSkills: SearchFilters = {
    organization_id: "company-id",
    match: "all",
    skills: [],
    verified_only: false,
    require_shared_project: false,
  };
  const submitted = submitSearch(noSkills);
  expect(submitted.skills).toEqual([]);
  expect(submitted.page).toBe(1);
  expect(submitted.page_size).toBe(20);
  expect(submitted.organization_id).toBe("company-id");
  expect(submitted.verified_only).toBe(false);
  expect(submitted.require_shared_project).toBe(false);
});

test("results are stale when nothing was submitted or the selected company changed", () => {
  const submitted = submitSearch(makeFilters());
  expect(isStaleResult(null, "company-id")).toBe(true);
  expect(isStaleResult(submitted, "company-id")).toBe(false);
  expect(isStaleResult(submitted, "other-company")).toBe(true);
  expect(isStaleResult(submitted, "")).toBe(true);

  // Pagination keeps the same organization, so a paged result stays current.
  expect(isStaleResult(pageFor(submitted, 3), "company-id")).toBe(false);
});
