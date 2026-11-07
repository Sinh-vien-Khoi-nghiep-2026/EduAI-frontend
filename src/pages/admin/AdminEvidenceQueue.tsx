import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { arbor, type AdminEvidence } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { capabilitiesFor, decodeClaims } from "@/auth/permissions";
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, Panel, Status } from "@/components/app-ui";

const STATUSES = ["self_reported", "verified", "rejected", "revoked"] as const;

export default function AdminEvidenceQueue() {
  const { token } = useSession();
  const organizations = useQuery({
    queryKey: ["organizations"],
    queryFn: () => arbor.organizations(token!),
  });
  // Reviewing needs a reviewer/admin membership in an approved organization.
  // A platform administrator without one must not be offered the action.
  const canReview = capabilitiesFor(decodeClaims(token), organizations.data).has("evidence.review");
  const evidence = useQuery({
    queryKey: ["admin-evidence"],
    queryFn: () => arbor.adminEvidence(token!, { page_size: 100 }),
  });

  if (evidence.isLoading) return <LoadingBlock label="Loading evidence…" />;
  if (evidence.isError) {
    return <ErrorBlock message="Evidence could not be loaded." retry={() => void evidence.refetch()} />;
  }

  const items = evidence.data?.items ?? [];
  const counts = STATUSES.map(status => ({
    status,
    count: items.filter(item => item.status === status).length,
  }));

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Platform administration"
        title="Evidence"
        description="Every piece of evidence submitted on the platform, with the verification state that decides whether linked skill claims can be treated as verified."
      />

      <div className="admin-metrics">
        {counts.map(entry => (
          <Panel className="admin-metric" key={entry.status}>
            <span>{entry.status.replace("_", " ")}</span>
            <strong>{entry.count}</strong>
            <small>listed of {evidence.data?.total ?? 0} total</small>
          </Panel>
        ))}
      </div>

      <Panel>
        {items.length === 0 ? (
          <EmptyBlock
            title="No evidence yet"
            description="Learners create evidence from their workspace; it appears here as soon as it is submitted."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th scope="col">Evidence</th>
                  <th scope="col">Source</th>
                  <th scope="col">Status</th>
                  <th scope="col">Revision</th>
                  <th scope="col">Owner</th>
                  <th scope="col">
                    <span className="admin-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: AdminEvidence) => (
                  <tr key={item.id}>
                    <td data-label="Evidence">
                      <strong>{item.title}</strong>
                      <span className="muted admin-ellipsis">{item.id}</span>
                    </td>
                    <td data-label="Source">
                      <code className="admin-code">{item.source}</code>
                    </td>
                    <td data-label="Status">
                      <Status
                        tone={
                          item.status === "verified"
                            ? "success"
                            : item.status === "rejected"
                              ? "danger"
                              : item.status === "revoked"
                                ? "warning"
                                : "neutral"
                        }
                      >
                        {item.status.replace("_", " ")}
                      </Status>
                    </td>
                    <td data-label="Revision">{item.revision}</td>
                    <td data-label="Owner">
                      <code className="admin-code admin-ellipsis">{item.owner_id}</code>
                    </td>
                    <td data-label="Actions">
                      {canReview ? (
                        <Link
                          to={`/admin/reviews?evidence=${encodeURIComponent(item.id)}`}
                          className="admin-link-button"
                        >
                          Review <ArrowRight size={13} aria-hidden />
                        </Link>
                      ) : (
                        <span className="muted">no review scope</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel className="admin-card">
        <div className="admin-card-head">
          <ClipboardList size={18} />
          <h2>Reviewing needs an eligible membership</h2>
        </div>
        <p>
          {canReview
            ? "Opening an evidence row prefills the review form. The backend still requires the learner to belong to or share scope with the organization you review for, otherwise it returns 403 learner_scope_required."
            : "Your account has no reviewer or admin role in an approved organization, so this list is read-only for you. A platform administrator can grant that membership from Organizations."}
        </p>
      </Panel>
    </div>
  );
}
