import { expect, test } from "bun:test";
import { criterionFrom, pageFor, submitSearch } from "./candidate-search";

test("candidate search preserves the selected school and immutable criteria across pages", () => {
  const criteria = [criterionFrom("typescript", "7", [])];
  const first = submitSearch({ organization_id: "company-id", school_id: "school-id", match: "all", skills: criteria, verified_only: true, require_shared_project: true });
  const second = pageFor(first, 2);
  expect(second).toEqual({ organization_id: "company-id", school_id: "school-id", match: "all", skills: [{ skill_id: "typescript", min_level: 7 }], verified_only: true, require_shared_project: true, page: 2, page_size: 20 });
  expect(second.skills).not.toBe(first.skills);
});
