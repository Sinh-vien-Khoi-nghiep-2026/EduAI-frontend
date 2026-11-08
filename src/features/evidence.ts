import type { EvidencePatchInput } from "@/api/arbor";

export type EvidenceEditSnapshot = {
  source: string;
  title: string;
  url: string;
  external_id: string;
  data: Record<string, unknown> | null;
};

/**
 * Builds a partial PATCH body. Only fields the dialog actually owns — and that
 * actually differ from what was loaded — are included, so a manual-ID update
 * never resets metadata the user never saw.
 */
export function buildEvidencePatch(
  values: { source: string; title: string; url: string; external_id: string },
  original: EvidenceEditSnapshot | null,
  data: Record<string, unknown> | null,
): EvidencePatchInput {
  const body: EvidencePatchInput = {
    source: values.source.trim(),
    title: values.title.trim(),
    url: values.url.trim() || null,
  };
  const external = values.external_id.trim();
  if (original === null) {
    // Manual-ID mode: nothing was loaded, so metadata stays untouched.
    body.external_id = external || null;
    return body;
  }
  if (external !== original.external_id) body.external_id = external || null;
  if (data !== null && JSON.stringify(data) !== JSON.stringify(original.data ?? {})) {
    body.data = data;
  }
  return body;
}

export function activeRecruiterSearchOrgIds(
  grants: { organization_id: string; scope: string; active: boolean }[],
) {
  return new Set(
    grants
      .filter(grant => grant.active && grant.scope === "recruiter_search")
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
