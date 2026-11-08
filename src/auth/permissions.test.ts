import { expect, test } from "bun:test";
import type { Organization } from "@/api/arbor";
import {
  capabilitiesFor,
  canAccessConsole,
  decodeClaims,
  isPlatformAdmin,
  isReviewerOnly,
  reviewOrganizations,
} from "./permissions";

function tokenWith(claims: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  return `${encode({ alg: "RS256", typ: "JWT" })}.${encode(claims)}.signature`;
}

const org = (overrides: Partial<Organization> = {}): Organization => ({
  id: "org-1",
  name: "Acme School",
  kind: "school",
  role: "member",
  approved: true,
  ...overrides,
});

test("claims are decoded from a JWT payload", () => {
  const claims = decodeClaims(tokenWith({ sub: "u1", platform_admin: true }));
  expect(claims).toMatchObject({ sub: "u1", platform_admin: true });
});

test("undecodable tokens yield no claims instead of throwing", () => {
  for (const token of [null, undefined, "", "not-a-jwt", "a.b.c", "a.!!!.c", "a.W10.c"]) {
    expect(decodeClaims(token)).toBeUndefined();
  }
});

test("platform admin requires the JSON boolean true, matching the backend", () => {
  expect(isPlatformAdmin({ platform_admin: true })).toBeTrue();
  // The backend rejects every non-boolean value, including truthy ones.
  for (const value of ["true", "false", "0", "1", "no", "yes", "", 0, 1, [], ["platform_admin"], {}, null]) {
    expect(isPlatformAdmin({ platform_admin: value })).toBeFalse();
  }
  expect(isPlatformAdmin(undefined)).toBeFalse();
  expect(isPlatformAdmin({})).toBeFalse();
});

test("realm role containers do not grant platform administration", () => {
  // The backend only reads the configured claim; mirroring role containers here
  // would render controls that always answer 403.
  expect(isPlatformAdmin({ roles: ["platform_admin"] })).toBeFalse();
  expect(isPlatformAdmin({ realm_access: { roles: ["platform_admin"] } })).toBeFalse();
  expect(isPlatformAdmin({ roles: ["member"] })).toBeFalse();
});

test("respects a renamed platform admin claim", () => {
  expect(isPlatformAdmin({ is_admin: true }, "is_admin")).toBeTrue();
  expect(isPlatformAdmin({ platform_admin: true }, "is_admin")).toBeFalse();
});

test("organization admin never implies platform admin", () => {
  const capabilities = capabilitiesFor({ platform_admin: false }, [org({ role: "admin" })]);
  expect(capabilities.has("evidence.review")).toBeTrue();
  expect(capabilities.has("taxonomy.write")).toBeFalse();
});

test("review scope requires approval and a reviewer or admin role", () => {
  expect(reviewOrganizations([org({ role: "reviewer" })])).toHaveLength(1);
  expect(reviewOrganizations([org({ role: "admin" })])).toHaveLength(1);
  expect(reviewOrganizations([org({ role: "member" })])).toHaveLength(0);
  expect(reviewOrganizations([org({ role: "recruiter" })])).toHaveLength(0);
  // An unapproved organization grants nothing even with the admin role.
  expect(reviewOrganizations([org({ role: "admin", approved: false })])).toHaveLength(0);
  expect(reviewOrganizations(undefined)).toHaveLength(0);
});

test("ordinary users have no console access", () => {
  expect(canAccessConsole(capabilitiesFor({}, [org({ role: "member" })]))).toBeFalse();
  expect(canAccessConsole(capabilitiesFor(undefined, undefined))).toBeFalse();
});

test("each capability unlocks the console on its own", () => {
  expect(canAccessConsole(capabilitiesFor({ platform_admin: true }, []))).toBeTrue();
  expect(canAccessConsole(capabilitiesFor({}, [org({ role: "reviewer" })]))).toBeTrue();
});

test("isReviewerOnly distinguishes reviewer accounts from platform admins and ordinary users", () => {
  const reviewerCaps = capabilitiesFor({}, [org({ role: "reviewer" })]);
  const adminCaps = capabilitiesFor({ platform_admin: true }, []);
  const multiCaps = capabilitiesFor({ platform_admin: true }, [org({ role: "reviewer" })]);
  const emptyCaps = capabilitiesFor({}, [org({ role: "member" })]);

  expect(isReviewerOnly(reviewerCaps)).toBeTrue();
  expect(isReviewerOnly(adminCaps)).toBeFalse();
  expect(isReviewerOnly(multiCaps)).toBeFalse();
  expect(isReviewerOnly(emptyCaps)).toBeFalse();
});
