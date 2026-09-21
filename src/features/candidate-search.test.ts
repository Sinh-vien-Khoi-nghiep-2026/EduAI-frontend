import { expect, test } from "bun:test";
import { criterionFrom, pageFor, submitSearch, type SearchFilters } from "./candidate-search";

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
