import type { Organization } from "@/api/arbor";

/**
 * Client-side view of the backend permission model.
 *
 * Every check here is advisory: it selects what the UI offers. The backend is
 * the only authority (it re-checks the JWT claim on POST /skills and the
 * approved reviewer/admin membership on POST /evidence/{id}/review), so a
 * forged claim can only ever produce a visible button that fails with 403.
 */

export type Capability = "taxonomy.write" | "evidence.review";

export type Claims = Record<string, unknown>;

/** Backend truthiness (`bool(claims.get(name, False))`), not JS truthiness. */
function backendTruthy(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.length > 0;
  return true;
}

export function decodeClaims(token: string | null | undefined): Claims | undefined {
  if (!token) return undefined;
  const payload = token.split(".")[1];
  if (!payload) return undefined;
  try {
    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Claims)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The backend reads a single configurable claim (`PLATFORM_ADMIN_CLAIM`,
 * default `platform_admin`). We also accept the common Keycloak role
 * containers so a realm that maps the role into `roles`/`realm_access` works.
 */
export function isPlatformAdmin(claims: Claims | undefined, claimName = "platform_admin"): boolean {
  if (!claims) return false;
  if (backendTruthy(claims[claimName])) return true;
  const roles = claims.roles;
  if (Array.isArray(roles) && roles.includes("platform_admin")) return true;
  const realm = claims.realm_access;
  if (typeof realm === "object" && realm !== null && "roles" in realm) {
    const realmRoles: unknown = realm.roles;
    if (Array.isArray(realmRoles) && realmRoles.includes("platform_admin")) return true;
  }
  return false;
}

/** Organizations where this user may review evidence: approved + reviewer/admin role. */
export function reviewOrganizations(organizations: Organization[] | undefined): Organization[] {
  return (organizations ?? []).filter(
    organization => organization.approved && (organization.role === "reviewer" || organization.role === "admin"),
  );
}

export function capabilitiesFor(
  claims: Claims | undefined,
  organizations: Organization[] | undefined,
): Set<Capability> {
  const capabilities = new Set<Capability>();
  if (isPlatformAdmin(claims)) capabilities.add("taxonomy.write");
  if (reviewOrganizations(organizations).length > 0) capabilities.add("evidence.review");
  return capabilities;
}

/** The console exists only for accounts with at least one administrative capability. */
export function canAccessConsole(capabilities: Set<Capability>): boolean {
  return capabilities.size > 0;
}
