import type { Organization } from "@/api/arbor";

/**
 * Client-side view of the backend permission model.
 *
 * Every check here is advisory: it selects what the UI offers. The backend is
 * the only authority (it re-checks the JWT claim on POST /skills and the
 * approved reviewer/admin membership on POST /evidence/{id}/review), so a
 * forged claim can only ever produce a visible button that fails with 403.
 */

export type Capability =
  | "taxonomy.write"
  | "evidence.review"
  | "users.manage"
  | "organizations.manage"
  | "evidence.browse"
  | "analytics.read";

export type Claims = Record<string, unknown>;

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
 * The backend reads one configurable claim (`PLATFORM_ADMIN_CLAIM`, default
 * `platform_admin`) and accepts only the JSON boolean `true` — see
 * `is_platform_admin` in `app/api/dependencies.py`. This mirrors that contract
 * exactly, so the UI never offers platform controls the API would refuse.
 *
 * `roles` and `realm_access.roles` are deliberately **not** consulted: the
 * backend does not read them, and treating them as authorization here would
 * show administrative screens to an account the API answers with 403.
 */
export function isPlatformAdmin(claims: Claims | undefined, claimName = "platform_admin"): boolean {
  if (!claims) return false;
  return claims[claimName] === true;
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
  if (isPlatformAdmin(claims)) {
    capabilities.add("taxonomy.write");
    capabilities.add("users.manage");
    capabilities.add("organizations.manage");
    capabilities.add("evidence.browse");
    capabilities.add("analytics.read");
  }
  if (reviewOrganizations(organizations).length > 0) capabilities.add("evidence.review");
  return capabilities;
}

/** The console exists only for accounts with at least one administrative capability. */
export function canAccessConsole(capabilities: Set<Capability>): boolean {
  return capabilities.size > 0;
}
