import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, GraduationCap, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { arbor } from "@/api/arbor";
import { capabilitiesFor, decodeClaims, reviewOrganizations } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import { countSkills } from "@/features/taxonomy";
import { ErrorBlock, LoadingBlock, PageHeader, Panel, Status } from "@/components/app-ui";

export default function AdminOverview() {
  const { token } = useSession();
  const organizations = useQuery({ queryKey: ["organizations"], queryFn: () => arbor.organizations(token!) });
  const skills = useQuery({ queryKey: ["skills"], queryFn: arbor.skills });
  const capabilities = capabilitiesFor(decodeClaims(token), organizations.data);
  const reviewerOrgs = reviewOrganizations(organizations.data);
  const counts = skills.data ? countSkills(skills.data) : undefined;

  if (organizations.isLoading || skills.isLoading) return <LoadingBlock label="Loading console summary…" />;
  if (organizations.isError || skills.isError) {
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
            Reviews take a known evidence ID: the API has no review queue or pending list. Decisions
            are scoped to an approved organization where you are reviewer or admin.
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

      <Panel className="admin-card admin-limits">
        <div className="admin-card-head">
          <ShieldQuestion size={18} />
          <h2>Not available in this backend</h2>
        </div>
        <ul>
          <li>No endpoint lists users, so there is no user administration screen.</li>
          <li>No endpoint lists or approves organizations; approval stays an operator action.</li>
          <li>No endpoint lists pending evidence, so review is ID-based by necessity.</li>
          <li>No platform analytics endpoint, so every number above comes from a real response.</li>
        </ul>
      </Panel>
    </div>
  );
}
