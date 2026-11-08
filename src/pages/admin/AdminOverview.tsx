import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, ClipboardList, GraduationCap, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { arbor } from "@/api/arbor";
import { capabilitiesFor, decodeClaims, isReviewerOnly, reviewOrganizations } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import { countSkills } from "@/features/taxonomy";
import { ErrorBlock, LoadingBlock, PageHeader, Panel, Status } from "@/components/app-ui";

export default function AdminOverview() {
  const { token } = useSession();
  const organizations = useQuery({ queryKey: ["organizations"], queryFn: () => arbor.organizations(token!) });
  const skills = useQuery({ queryKey: ["skills"], queryFn: arbor.skills });
  // Platform totals, available only to a platform administrator.
  const analytics = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => arbor.analytics(token!),
    enabled: capabilitiesFor(decodeClaims(token), organizations.data).has("analytics.read"),
  });
  const capabilities = capabilitiesFor(decodeClaims(token), organizations.data);
  const reviewerOrgs = reviewOrganizations(organizations.data);
  const counts = skills.data ? countSkills(skills.data) : undefined;
  const reviewerOnly = isReviewerOnly(capabilities);

  // The reviewer branch must not wait on data a reviewer cannot fetch: `skills`
  // and `admin-analytics` are platform-admin endpoints (403 for a reviewer).
  if (organizations.isLoading) return <LoadingBlock label="Loading console summary…" />;
  if (organizations.isError) {
    return (
      <ErrorBlock
        message="The console summary could not be loaded."
        retry={() => void organizations.refetch()}
      />
    );
  }

  if (reviewerOnly) {
    return (
      <div className="stack">
        <PageHeader
          eyebrow="Review workspace"
          title="Review Evidence"
          description="Review submitted evidence for your approved organizations."
        />

        <div className="admin-metrics">
          <Panel className="admin-metric">
            <span>Review organizations</span>
            <strong>{reviewerOrgs.length}</strong>
            <small>Approved memberships with reviewer or admin role</small>
          </Panel>
        </div>

        <div className="admin-grid">
          <Panel className="admin-card">
            <div className="admin-card-head">
              <ShieldCheck size={18} />
              <h2>Evidence review</h2>
              <Status tone={reviewerOrgs.length ? "success" : "warning"}>
                {reviewerOrgs.length ? "Available" : "No eligible org"}
              </Status>
            </div>
            <p>
              Browse evidence submissions by approved organization. Select an organization to view eligible
              learners and their evidence, and record verification decisions.
            </p>
            <Link to="/admin/reviews" className="admin-card-link">
              Open reviews <ArrowRight size={15} />
            </Link>
          </Panel>
        </div>

        <Panel>
          <h2 className="admin-form-title">Eligible review organizations</h2>
          {reviewerOrgs.length === 0 ? (
            <p className="admin-note">You have no approved organizations with reviewer or admin permissions.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table admin-table">
                <thead>
                  <tr>
                    <th scope="col">Organization</th>
                    <th scope="col">Kind</th>
                    <th scope="col">Your role</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewerOrgs.map(org => (
                    <tr key={org.id}>
                      <td data-label="Organization">
                        <strong>{org.name}</strong>
                      </td>
                      <td data-label="Kind">
                        <span className="muted">{org.kind}</span>
                      </td>
                      <td data-label="Your role">
                        <code className="admin-code">{org.role}</code>
                      </td>
                      <td data-label="Action">
                        <Link to="/admin/reviews" className="admin-card-link">
                          Review evidence <ArrowRight size={14} />
                        </Link>
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

  // Platform-admin rendering is unchanged: it still waits for the taxonomy and
  // analytics queries this branch actually renders.
  if (skills.isLoading || analytics.isLoading) {
    return <LoadingBlock label="Loading console summary…" />;
  }
  if (skills.isError) {
    return (
      <ErrorBlock
        message="The console summary could not be loaded."
        retry={() => void Promise.all([organizations.refetch(), skills.refetch()])}
      />
    );
  }

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Administration"
        title="Console overview"
        description="What this account can actually administer, measured from the endpoints the API exposes today."
      />

      <div className="admin-metrics">
        <Panel className="admin-metric">
          <span>Published taxonomy skills</span>
          <strong>{counts?.total ?? 0}</strong>
          <small>{counts?.roots ?? 0} top-level entries · GET /skills</small>
        </Panel>
        <Panel className="admin-metric">
          <span>Review organizations</span>
          <strong>{reviewerOrgs.length}</strong>
          <small>Approved memberships with reviewer or admin role</small>
        </Panel>
        <Panel className="admin-metric">
          <span>Accounts</span>
          <strong>{analytics.data?.users ?? "—"}</strong>
          <small>GET /admin/analytics</small>
        </Panel>
        <Panel className="admin-metric">
          <span>Organizations awaiting approval</span>
          <strong>{analytics.data?.organizations.pending ?? "—"}</strong>
          <small>
            {analytics.data
              ? `${analytics.data.organizations.approved} approved of ${analytics.data.organizations.total}`
              : "Platform administrators only"}
          </small>
        </Panel>
        <Panel className="admin-metric">
          <span>Evidence verified</span>
          <strong>{analytics.data?.evidence.by_status.verified ?? "—"}</strong>
          <small>
            {analytics.data ? `${analytics.data.evidence.total} submitted in total` : "Platform administrators only"}
          </small>
        </Panel>
        <Panel className="admin-metric">
          <span>Taxonomy authoring</span>
          <strong>{capabilities.has("taxonomy.write") ? "Granted" : "Not granted"}</strong>
          <small>JWT platform_admin claim</small>
        </Panel>
      </div>

      <div className="admin-grid">
        <Panel className="admin-card">
          <div className="admin-card-head">
            <GraduationCap size={18} />
            <h2>Skill taxonomy</h2>
            <Status tone={capabilities.has("taxonomy.write") ? "success" : "neutral"}>
              {capabilities.has("taxonomy.write") ? "Can create" : "Read only"}
            </Status>
          </div>
          <p>
            The shared taxonomy is readable by everyone. Creating a skill requires the
            <code>platform_admin</code> JWT claim; the backend rejects anything else with
            403 <code>platform_admin_required</code>.
          </p>
          <Link to="/admin/taxonomy" className="admin-card-link">
            Open taxonomy <ArrowRight size={15} />
          </Link>
        </Panel>

        <Panel className="admin-card">
          <div className="admin-card-head">
            <ShieldCheck size={18} />
            <h2>Evidence review</h2>
            <Status tone={reviewerOrgs.length ? "success" : "warning"}>
              {reviewerOrgs.length ? "Available" : "No eligible org"}
            </Status>
          </div>
          <p>
            Browse evidence submissions by approved organization. Select an organization to view eligible
            learners and their evidence, and record verification decisions.
          </p>
          <Link to="/admin/reviews" className="admin-card-link">
            Open reviews <ArrowRight size={15} />
          </Link>
        </Panel>

        <Panel className="admin-card">
          <div className="admin-card-head">
            <Building2 size={18} />
            <h2>Access scope</h2>
            <Status tone="neutral">{organizations.data?.length ?? 0} memberships</Status>
          </div>
          <p>
            Your roles, the organizations behind them, and the exact admin capabilities they unlock.
            Organization approval itself is not exposed by the API.
          </p>
          <Link to="/admin/access" className="admin-card-link">
            Open access scope <ArrowRight size={15} />
          </Link>
        </Panel>
      </div>

      {/* Platform-wide sections are offered only to a platform administrator;
          a reviewer would otherwise land on a Restricted page. */}
      {capabilities.has("users.manage") && (
        <div className="admin-grid">
          <Panel className="admin-card">
            <div className="admin-card-head">
              <Users size={18} />
              <h2>Accounts</h2>
              <Status tone="neutral">{analytics.data?.users ?? 0} total</Status>
            </div>
            <p>Search accounts, inspect their organization roles, and correct a display name.</p>
            <Link to="/admin/users" className="admin-card-link">
              Open accounts <ArrowRight size={15} />
            </Link>
          </Panel>
          <Panel className="admin-card">
            <div className="admin-card-head">
              <Building2 size={18} />
              <h2>Organizations</h2>
              <Status tone={analytics.data?.organizations.pending ? "warning" : "success"}>
                {analytics.data?.organizations.pending ?? 0} pending
              </Status>
            </div>
            <p>Approve or revoke an organization, then staff it with reviewer and recruiter roles.</p>
            <Link to="/admin/organizations" className="admin-card-link">
              Open organizations <ArrowRight size={15} />
            </Link>
          </Panel>
          <Panel className="admin-card">
            <div className="admin-card-head">
              <ClipboardList size={18} />
              <h2>Evidence</h2>
              <Status tone="neutral">{analytics.data?.evidence.total ?? 0} submitted</Status>
            </div>
            <p>Browse every submission and jump straight into a decision with the row preselected.</p>
            <Link to="/admin/evidence" className="admin-card-link">
              Open evidence <ArrowRight size={15} />
            </Link>
          </Panel>
        </div>
      )}
    </div>
  );
}
