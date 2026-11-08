import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { arbor } from "@/api/arbor";
import { reviewOrganizations } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import {
  Button,
  EmptyBlock,
  ErrorBlock,
  Field,
  fieldError,
  formatError,
  LoadingBlock,
  PageHeader,
  Panel,
  Status,
} from "@/components/app-ui";

type Decision = "verified" | "rejected" | "revoked";

const decisionHelp: Record<Decision, string> = {
  verified: "Marks the evidence verified at its current revision and records you as the verifier.",
  rejected: "Records a rejection for the current revision without assigning a verifier.",
  revoked: "Withdraws a previous verification at the current revision.",
};

function statusTone(status: string): "success" | "danger" | "warning" | "neutral" {
  if (status === "verified") return "success";
  if (status === "rejected") return "danger";
  if (status === "revoked") return "warning";
  return "neutral";
}

export default function AdminReviews() {
  const { token } = useSession();
  const client = useQueryClient();
  const [params] = useSearchParams();

  // Primary: new review organizations endpoint
  const reviewOrgsQuery = useQuery({
    queryKey: ["review-organizations"],
    queryFn: () => arbor.reviewOrganizations(token!),
    enabled: Boolean(token),
  });

  // Fallback: /organizations/mine
  const fallbackOrgsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: () => arbor.organizations(token!),
    enabled: Boolean(token) && reviewOrgsQuery.isError,
  });

  const eligible = reviewOrgsQuery.data ?? reviewOrganizations(fallbackOrgsQuery.data);

  const [organizationId, setOrganizationId] = useState("");
  const [evidenceId, setEvidenceId] = useState(params.get("evidence") ?? "");
  const [status, setStatus] = useState<Decision>("verified");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<Error>();
  const [receipt, setReceipt] = useState<{ id: string; status: string; revision: number }>();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Copied value is the complete UUID: reviewers paste it into the manual form
  // or share it with the learner, so a truncated ID would be useless.
  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setCopyError(null);
      setTimeout(() => setCopiedId(prev => (prev === id ? null : prev)), 2000);
    } catch (cause) {
      setCopiedId(null);
      setCopyError(`Clipboard copy failed: ${formatError(cause)}`);
      setTimeout(() => setCopyError(null), 3000);
    }
  };

  // Fetch learners and evidence for the selected organization
  const detailQuery = useQuery({
    queryKey: ["review-organization-detail", organizationId],
    queryFn: () => arbor.reviewOrganizationDetail(token!, organizationId),
    enabled: Boolean(token && organizationId),
  });

  const review = useMutation({
    mutationFn: (body: { evidenceId: string; organizationId: string; status: Decision; note?: string }) =>
      arbor.reviewEvidence(token!, body.evidenceId, {
        organization_id: body.organizationId,
        status: body.status,
        note: body.note,
      }),
    onSuccess: result => {
      setReceipt({ id: result.id, status: result.status, revision: result.evidence_revision });
      setEvidenceId("");
      setNote("");
      void client.invalidateQueries({ queryKey: ["review-organization-detail", organizationId] });
      void client.invalidateQueries({ queryKey: ["my-skills"] });
      void client.invalidateQueries({ queryKey: ["admin-evidence"] });
      void client.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
  });

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    setReceipt(undefined);
    const id = evidenceId.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      setFormError(new Error("Enter the evidence UUID exactly as the learner shared it."));
      return;
    }
    if (!organizationId) {
      setFormError(new Error("Choose the organization you review on behalf of."));
      return;
    }
    review.mutate(
      { evidenceId: id, organizationId, status, note: note.trim() || undefined },
      { onError: setFormError },
    );
  }

  function handleDecision(evId: string, decisionStatus: Decision) {
    setFormError(undefined);
    setReceipt(undefined);
    if (!organizationId) {
      setFormError(new Error("Choose an organization first."));
      return;
    }
    review.mutate(
      { evidenceId: evId, organizationId, status: decisionStatus },
      { onError: setFormError },
    );
  }

  if (reviewOrgsQuery.isLoading || (reviewOrgsQuery.isError && fallbackOrgsQuery.isLoading)) {
    return <LoadingBlock label="Checking review eligibility…" />;
  }

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Organization scope"
        title="Evidence review"
        description="Review submitted evidence for learners belonging to your approved review organizations."
      />

      {eligible.length === 0 ? (
        <Panel>
          <EmptyBlock
            title="No review scope"
            description="Your account needs an approved organization membership with the reviewer or admin role. Organization approval is an operator action, not an API call."
          />
        </Panel>
      ) : (
        <>
          <Panel>
            <div className="modal-fields" style={{ maxWidth: 420 }}>
              <Field label="Reviewing organization" error={fieldError(formError, "organization_id")}>
                <select
                  value={organizationId}
                  onChange={event => {
                    setOrganizationId(event.target.value);
                    setReceipt(undefined);
                    setFormError(undefined);
                  }}
                  required
                >
                  <option value="">Select an organization to review</option>
                  {eligible.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name} · {org.role}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Panel>

          {receipt && (
            <Panel className="admin-receipt">
              <Status tone={receipt.status === "verified" ? "success" : receipt.status === "rejected" ? "danger" : "warning"}>
                {receipt.status}
              </Status>
              <p>
                Decision recorded for evidence revision <strong>{receipt.revision}</strong>.
              </p>
              <code className="admin-code admin-ellipsis">{receipt.id}</code>
            </Panel>
          )}

          {formError && <p className="form-error">{formatError(formError)}</p>}
          {copyError && <p className="form-error">{copyError}</p>}

          {organizationId ? (
            <div className="stack">
              {detailQuery.isLoading && <LoadingBlock label="Loading learners and evidence…" />}
              {detailQuery.isError && (
                <ErrorBlock
                  message={formatError(detailQuery.error)}
                  retry={() => void detailQuery.refetch()}
                />
              )}
              {detailQuery.data && (
                <>
                  {detailQuery.data.learners.length === 0 ? (
                    <Panel>
                      <p className="admin-note">
                        No learners found for this organization. Learners must belong to the organization or share evidence scope with it.
                      </p>
                    </Panel>
                  ) : (
                    detailQuery.data.learners.map(learner => (
                      <Panel key={learner.user_id}>
                        <div className="admin-card-head" style={{ marginBottom: "0.75rem" }}>
                          <div>
                            <strong>{learner.display_name ?? "Learner"}</strong>
                            <small className="muted" style={{ marginLeft: "0.5rem" }}>
                              {learner.email ?? learner.user_id}
                            </small>
                          </div>
                          <Status tone="neutral">
                            {learner.evidence.length} {learner.evidence.length === 1 ? "evidence" : "pieces of evidence"}
                          </Status>
                        </div>

                        {learner.evidence.length === 0 ? (
                          <p className="admin-note">No evidence submitted yet.</p>
                        ) : (
                          <div className="table-wrap">
                            <table className="data-table admin-table">
                              <thead>
                                <tr>
                                  <th scope="col">Title</th>
                                  <th scope="col">Source</th>
                                  <th scope="col">Status</th>
                                  <th scope="col">Revision</th>
                                  <th scope="col">URL</th>
                                  <th scope="col">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {learner.evidence.map(ev => (
                                  <tr key={ev.id}>
                                    <td data-label="Title">
                                      <strong>{ev.title}</strong>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                                        <code
                                          className="admin-code"
                                          style={{ userSelect: "all", fontSize: 11, wordBreak: "break-all" }}
                                        >
                                          {ev.id}
                                        </code>
                                        <Button
                                          variant="quiet"
                                          aria-label={`Copy evidence ID ${ev.id}`}
                                          onClick={() => void copyId(ev.id)}
                                          style={{ padding: "2px 6px", height: "auto", fontSize: 11 }}
                                        >
                                          {copiedId === ev.id ? (
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#1f6a4b" }}>
                                              <Check size={12} /> Copied
                                            </span>
                                          ) : (
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                              <Copy size={12} /> Copy ID
                                            </span>
                                          )}
                                        </Button>
                                      </div>
                                    </td>
                                    <td data-label="Source">
                                      <span className="muted">{ev.source}</span>
                                    </td>
                                    <td data-label="Status">
                                      <Status tone={statusTone(ev.status)}>{ev.status}</Status>
                                    </td>
                                    <td data-label="Revision">r{ev.revision}</td>
                                    <td data-label="URL">
                                      {ev.url ? (
                                        <a
                                          href={ev.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="admin-card-link"
                                        >
                                          Link <ExternalLink size={13} />
                                        </a>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                    <td data-label="Actions">
                                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                                        <Button
                                          variant="primary"
                                          disabled={review.isPending}
                                          onClick={() => handleDecision(ev.id, "verified")}
                                        >
                                          Verify
                                        </Button>
                                        <Button
                                          variant="secondary"
                                          disabled={review.isPending}
                                          onClick={() => handleDecision(ev.id, "rejected")}
                                        >
                                          Reject
                                        </Button>
                                        <Button
                                          variant="danger"
                                          disabled={review.isPending}
                                          onClick={() => handleDecision(ev.id, "revoked")}
                                        >
                                          Revoke
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </Panel>
                    ))
                  )}
                </>
              )}
            </div>
          ) : (
            <Panel>
              <p className="admin-note">Choose an organization above to view its learners and pending evidence.</p>
            </Panel>
          )}

          <Panel className="admin-form-panel">
            <h2 className="admin-form-title">Manual evidence entry</h2>
            <p className="admin-note" style={{ marginBottom: "1rem" }}>
              Have a direct evidence UUID? You can review it manually here.
            </p>
            <form onSubmit={submitManual} noValidate>
              <div className="stack modal-fields">
                <Field
                  label="Evidence ID"
                  hint="UUID returned when the learner created the evidence"
                  error={fieldError(formError, "evidence_id")}
                >
                  <input
                    value={evidenceId}
                    onChange={event => setEvidenceId(event.target.value)}
                    placeholder="00000000-0000-0000-0000-000000000000"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </Field>
                <fieldset className="admin-decisions">
                  <legend>Decision</legend>
                  {(["verified", "rejected", "revoked"] as const).map(option => (
                    <label key={option} className={status === option ? "admin-decision selected" : "admin-decision"}>
                      <input
                        type="radio"
                        name="manual-status"
                        value={option}
                        checked={status === option}
                        onChange={() => setStatus(option)}
                      />
                      <span>{option}</span>
                      <small>{decisionHelp[option]}</small>
                    </label>
                  ))}
                </fieldset>
                <Field label="Note" hint="Optional, stored on the verification record" error={fieldError(formError, "note")}>
                  <textarea value={note} onChange={event => setNote(event.target.value)} rows={2} />
                </Field>
              </div>
              <div className="form-actions" style={{ marginTop: "1rem" }}>
                <Button type="submit" disabled={review.isPending}>
                  {review.isPending ? "Submitting…" : "Submit decision"}
                </Button>
              </div>
            </form>
          </Panel>
        </>
      )}
    </div>
  );
}
