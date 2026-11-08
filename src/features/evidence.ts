import type { EvidencePatchInput } from "@/api/arbor";

export type EvidenceEditSnapshot = {
  source: string;
  title: string;
  url: string;
  external_id: string;
  data: Record<string, unknown> | null;
};

/**
 * Builds a partial PATCH body. Only fields that actually differ from what was
 * loaded are included, so a save that changes nothing sends `{}` and the server
 * leaves the record — and any verification — untouched. A manual-ID update has
 * no original to compare against, so it sends what the user typed and never
 * touches metadata it could not have shown.
 */
export function buildEvidencePatch(
  values: { source: string; title: string; url: string; external_id: string },
  original: EvidenceEditSnapshot | null,
  data: Record<string, unknown> | null,
): EvidencePatchInput {
  const source = values.source.trim();
  const title = values.title.trim();
  const url = values.url.trim();
  const external = values.external_id.trim();

  if (original === null) {
    // Manual-ID mode: nothing was loaded, so metadata stays untouched.
    return { source, title, url: url || null, external_id: external || null };
  }

  const body: EvidencePatchInput = {};
  if (source !== original.source) body.source = source;
  if (title !== original.title) body.title = title;
  // An explicit clear of a previously set URL must still be sent as null.
  if (url !== original.url) body.url = url || null;
  if (external !== original.external_id) body.external_id = external || null;
  if (data !== null && JSON.stringify(data) !== JSON.stringify(original.data ?? {})) {
    body.data = data;
  }
  return body;
}

/**
 * Grants the candidate search can actually use. Mirrors `_share_access` in the
 * backend candidates router: a grant only counts when it is active, scoped to
 * recruiter_search, and held by an APPROVED COMPANY. A grant to a school, or to
 * a company that is still pending, never matches a search.
 */
export function activeRecruiterSearchOrgIds(
  grants: {
    organization_id: string;
    scope: string;
    active: boolean;
    organization_approved: boolean;
    organization_kind: string;
  }[],
) {
  return new Set(
    grants
      .filter(
        grant =>
          grant.active &&
          grant.scope === "recruiter_search" &&
          grant.organization_approved &&
          grant.organization_kind === "company",
      )
      .map(grant => grant.organization_id),
  );
}

export function recruiterSharingWarning(
  recruiterSearchable: boolean,
  grantOrgIds: Set<string>,
): "no_grant" | "not_searchable" | null {
  const hasGrant = grantOrgIds.size > 0;
  if (recruiterSearchable && !hasGrant) return "no_grant";
  if (!recruiterSearchable && hasGrant) return "not_searchable";
  return null;
}
