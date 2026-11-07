import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
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

export default function AdminReviews() {
  const { token } = useSession();
  const client = useQueryClient();
  const organizations = useQuery({ queryKey: ["organizations"], queryFn: () => arbor.organizations(token!) });
  const [params] = useSearchParams();
  const [organizationId, setOrganizationId] = useState("");
  // The admin evidence list deep-links here with the row preselected.
  const [evidenceId, setEvidenceId] = useState(params.get("evidence") ?? "");
  const [status, setStatus] = useState<Decision>("verified");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<Error>();
  const [receipt, setReceipt] = useState<{ id: string; status: string; revision: number }>();

  const eligible = reviewOrganizations(organizations.data);
  const selectedOrganization = eligible.find(org => org.id === organizationId);

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
      void client.invalidateQueries({ queryKey: ["my-skills"] });
      // A decision changes evidence status, so the queue and the analytics
      // counters derived from it are stale until refetched.
      void client.invalidateQueries({ queryKey: ["admin-evidence"] });
      void client.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
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

  if (organizations.isLoading) return <LoadingBlock label="Checking review eligibility…" />;
  if (organizations.isError) {
    return <ErrorBlock message={formatError(organizations.error)} retry={() => void organizations.refetch()} />;
  }

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Organization scope"
        title="Evidence review"
        description="Review a known evidence ID inside an approved organization you belong to. This API has no pending-review queue, so nothing is listed until an ID exists."
      />

      {eligible.length === 0 ? (
        <Panel>
          <EmptyBlock
            title="No review scope"
            description="Your account needs an approved organization membership with the reviewer or admin role. Organization approval is an operator action, not an API call."
          />
        </Panel>
      ) : (
        <div className="admin-grid admin-grid-review">
          <Panel className="admin-form-panel">
            <form onSubmit={submit} noValidate>
              <h2 className="admin-form-title">Record a decision</h2>
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
                    required
                  />
                </Field>
                <Field label="Organization" error={fieldError(formError, "organization_id")}>
                  <select
                    value={organizationId}
                    onChange={event => setOrganizationId(event.target.value)}
                    required
                  >
                    <option value="">Select an organization</option>
                    {eligible.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name} · {org.role}
                      </option>
                    ))}
                  </select>
                </Field>
                <fieldset className="admin-decisions">
                  <legend>Decision</legend>
                  {(["verified", "rejected", "revoked"] as const).map(option => (
                    <label key={option} className={status === option ? "admin-decision selected" : "admin-decision"}>
                      <input
                        type="radio"
                        name="status"
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
                  <textarea value={note} onChange={event => setNote(event.target.value)} rows={3} />
                </Field>
              </div>
              {formError && <p className="form-error">{formatError(formError)}</p>}
              <div className="form-actions">
                <Button type="submit" disabled={review.isPending}>
                  {review.isPending ? "Submitting…" : "Submit decision"}
                </Button>
              </div>
            </form>
          </Panel>

          <div className="stack">
            <Panel className="admin-context">
              <h2 className="admin-form-title">Who this applies to</h2>
              <p>
                The backend accepts the review only when the learner belongs to{" "}
                <strong>{selectedOrganization?.name ?? "the selected organization"}</strong> or has
                shared evidence or verification scope with it. Otherwise it returns 403{" "}
                <code>learner_scope_required</code>.
              </p>
              <ul className="admin-facts">
                <li>
                  <ShieldCheck size={15} aria-hidden /> Reviewer or admin role required in an approved organization
                </li>
                <li>
                  <CheckCircle2 size={15} aria-hidden /> Success returns the verification record ID
                </li>
                <li>
                  <XCircle size={15} aria-hidden /> Editing the evidence afterwards invalidates the decision
                </li>
              </ul>
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
          </div>
        </div>
      )}
    </div>
  );
}
