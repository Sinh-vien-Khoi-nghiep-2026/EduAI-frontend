import { expect, test } from "bun:test";
import { activeRecruiterSearchOrgIds, buildEvidencePatch, recruiterSharingWarning } from "./evidence";

const original = {
  source: "github",
  title: "Commit",
  url: "https://example.com/commit",
  external_id: "gh-1",
  data: { sha: "abc" },
};

test("manual-ID mode sends no data key and nulls a blank external id", () => {
  const patch = buildEvidencePatch(
    { source: "github", title: "New title", url: "", external_id: "" },
    null,
    null,
  );
  expect("data" in patch).toBe(false);
  expect(patch.external_id).toBeNull();
  expect(patch.url).toBeNull();
  expect(patch.title).toBe("New title");
});

test("manual-ID mode keeps a typed external id", () => {
  const patch = buildEvidencePatch(
    { source: "github", title: "T", url: "https://x.test", external_id: "gh-9" },
    null,
    null,
  );
  expect(patch.external_id).toBe("gh-9");
  expect(patch.url).toBe("https://x.test");
});

test("row edit omits unchanged external_id and data", () => {
  const patch = buildEvidencePatch(
    { source: "github", title: "Renamed", url: original.url, external_id: original.external_id },
    original,
    original.data,
  );
  expect("external_id" in patch).toBe(false);
  expect("data" in patch).toBe(false);
  expect(patch.title).toBe("Renamed");
});

test("clearing a previously set external id sends null", () => {
  const patch = buildEvidencePatch(
    { source: "github", title: "T", url: original.url, external_id: "" },
    original,
    original.data,
  );
  expect(patch.external_id).toBeNull();
});

test("changed data is included only when it actually differs", () => {
  const changed = buildEvidencePatch(
    { source: "github", title: "T", url: original.url, external_id: original.external_id },
    original,
    { sha: "def" },
  );
  expect(changed.data).toEqual({ sha: "def" });
});

test("activeRecruiterSearchOrgIds filters inactive and non recruiter_search grants", () => {
  const ids = activeRecruiterSearchOrgIds([
    { organization_id: "a", scope: "recruiter_search", active: true },
    { organization_id: "b", scope: "recruiter_search", active: false },
    { organization_id: "c", scope: "evidence", active: true },
    { organization_id: "d", scope: "recruiter_search", active: true },
  ]);
  expect([...ids].sort()).toEqual(["a", "d"]);
});

test("recruiterSharingWarning flags the two mismatched states", () => {
  const none = new Set<string>();
  const some = new Set(["a"]);
  expect(recruiterSharingWarning(true, none)).toBe("no_grant");
  expect(recruiterSharingWarning(false, some)).toBe("not_searchable");
  expect(recruiterSharingWarning(true, some)).toBeNull();
  expect(recruiterSharingWarning(false, none)).toBeNull();
});
