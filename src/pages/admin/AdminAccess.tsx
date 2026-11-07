import { useQuery } from "@tanstack/react-query";
import { Building2, KeyRound, ShieldCheck } from "lucide-react";
import { arbor } from "@/api/arbor";
import { capabilitiesFor, decodeClaims, reviewOrganizations } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import { ErrorBlock, LoadingBlock, PageHeader, Panel, Status } from "@/components/app-ui";
import { formatDate } from "@/lib/display";

export default function AdminAccess() {
  const { token, user } = useSession();
  const organizations = useQuery({ queryKey: ["organizations"], queryFn: () => arbor.organizations(token!) });
  const claims = decodeClaims(token);
  const capabilities = capabilitiesFor(claims, organizations.data);
  const reviewerOrgs = reviewOrganizations(organizations.data);

  if (organizations.isLoading) return <LoadingBlock label="Loading access scope…" />;
  if (organizations.isError) {
    return <ErrorBlock message="Your memberships could not be loaded." retry={() => void organizations.refetch()} />;
  }

  const canWriteTaxonomy = capabilities.has("taxonomy.write");

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Authorization"
        title="Access scope"
        description="Derived from your access token and your own organization memberships. The backend re-authorizes every administrative request, so this view explains what you can attempt."
      />

      <div className="admin-grid">
        <Panel className="admin-card">
          <div className="admin-card-head">
            <KeyRound size={18} />
            <h2>Token capabilities</h2>
            <Status tone={canWriteTaxonomy ? "success" : "neutral"}>
              {canWriteTaxonomy ? "Platform admin" : "Standard account"}
            </Status>
          </div>
          <dl className="admin-facts admin-facts-rows">
            <div>
              <dt>Account</dt>
              <dd>{user?.email ?? user?.display_name ?? "—"}</dd>
            </div>
            <div>
              <dt>platform_admin claim</dt>
              <dd>{canWriteTaxonomy ? "present" : "absent"}</dd>
            </div>
            <div>
              <dt>Issuer</dt>
              <dd><code className="admin-code admin-ellipsis">{String(claims?.iss ?? "—")}</code></dd>
            </div>
            <div>
              <dt>Token expires</dt>
              <dd>{typeof claims?.exp === "number" ? formatDate(new Date(claims.exp * 1000).toISOString()) : "—"}</dd>
            </div>
          </dl>
          <p className="admin-note">
            The console decides what to show from these values. It never treats an organization
            <code>admin</code> role as platform-wide access, because the backend requires the JWT claim for
            taxonomy writes.
          </p>
        </Panel>

        <Panel className="admin-card">
          <div className="admin-card-head">
            <ShieldCheck size={18} />
            <h2>Review scope</h2>
            <Status tone={reviewerOrgs.length ? "success" : "warning"}>
              {reviewerOrgs.length} eligible
            </Status>
          </div>
          {reviewerOrgs.length === 0 ? (
            <p className="admin-note">
              No approved organization has given you the reviewer or admin role. Evidence review stays
              unavailable until an operator grants it.
            </p>
          ) : (
            <ul className="admin-org-list">
              {reviewerOrgs.map(org => (
                <li key={org.id}>
                  <Building2 size={16} aria-hidden />
                  <div>
                    <strong>{org.name}</strong>
                    <small>{org.kind}</small>
                  </div>
                  <Status tone="success">{org.role}</Status>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel>
        <h2 className="admin-form-title">All memberships</h2>
        {(organizations.data ?? []).length === 0 ? (
          <p className="admin-note">You have no organization memberships.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th scope="col">Organization</th>
                  <th scope="col">Kind</th>
                  <th scope="col">Your role</th>
                  <th scope="col">Approval</th>
                </tr>
              </thead>
              <tbody>
                {(organizations.data ?? []).map(org => (
                  <tr key={org.id}>
                    <td data-label="Organization"><strong>{org.name}</strong></td>
                    <td data-label="Kind"><span className="muted">{org.kind}</span></td>
                    <td data-label="Your role"><code className="admin-code">{org.role}</code></td>
                    <td data-label="Approval">
                      <Status tone={org.approved ? "success" : "warning"}>
                        {org.approved ? "approved" : "pending"}
                      </Status>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
