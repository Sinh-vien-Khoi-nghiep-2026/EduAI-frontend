import { expect, test } from "bun:test";
import type { Organization } from "@/api/arbor";
import {
  capabilitiesFor,
  canAccessConsole,
  decodeClaims,
  isPlatformAdmin,
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

test("platform admin follows backend truthiness of the configurable claim", () => {
  expect(isPlatformAdmin({ platform_admin: true })).toBeTrue();
  expect(isPlatformAdmin({ platform_admin: "true" })).toBeTrue();
  expect(isPlatformAdmin({ platform_admin: 1 })).toBeTrue();
  // Python bool() treats these as falsy; the console must agree.
  expect(isPlatformAdmin({ platform_admin: false })).toBeFalse();
  expect(isPlatformAdmin({ platform_admin: "" })).toBeFalse();
  expect(isPlatformAdmin({ platform_admin: 0 })).toBeFalse();
  expect(isPlatformAdmin({ platform_admin: null })).toBeFalse();
  expect(isPlatformAdmin(undefined)).toBeFalse();
});

test("platform admin also resolves through Keycloak role containers", () => {
  expect(isPlatformAdmin({ roles: ["platform_admin"] })).toBeTrue();
  expect(isPlatformAdmin({ realm_access: { roles: ["platform_admin"] } })).toBeTrue();
  expect(isPlatformAdmin({ roles: ["member"] })).toBeFalse();
  expect(isPlatformAdmin({ realm_access: { roles: "platform_admin" } })).toBeFalse();
  expect(isPlatformAdmin({ realm_access: "platform_admin" })).toBeFalse();
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
