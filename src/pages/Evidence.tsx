import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, Pencil, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { arbor, type EvidenceCreated, type EvidenceInput, type EvidenceReview } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { Button, Dialog, Field, fieldError, formatError, PageHeader, Panel, Status } from "@/components/app-ui";

type EvidenceMode = "create" | "edit" | "review" | null;
type EvidenceResult = EvidenceCreated | EvidenceReview;

export default function Evidence() {
  const { token } = useSession();
  const client = useQueryClient();
  const [mode, setMode] = useState<EvidenceMode>(null);
  const [error, setError] = useState<Error>();
  const [notice, setNotice] = useState("");
  const organizations = useQuery({ queryKey: ["organizations"], queryFn: () => arbor.organizations(token!) });
  const close = () => { setMode(null); setError(undefined); };
  const save = useMutation<EvidenceResult, Error, FormData>({
    mutationFn: async data => {
      const evidence: EvidenceInput = { source: String(data.get("source")).trim(), external_id: String(data.get("externalId")).trim() || undefined, url: String(data.get("url")).trim() || undefined, title: String(data.get("title")).trim(), data: {} };
      if (mode === "create") return arbor.createEvidence(token!, evidence);
      const evidenceId = String(data.get("evidenceId")).trim();
      if (!evidenceId) throw new Error("Enter an evidence ID.");
      if (mode === "edit") return arbor.updateEvidence(token!, evidenceId, evidence);
      const status = String(data.get("status"));
      if (status !== "verified" && status !== "rejected" && status !== "revoked") throw new Error("Choose a valid review decision.");
      return arbor.reviewEvidence(token!, evidenceId, { organization_id: String(data.get("organizationId")), status, note: String(data.get("note")).trim() || undefined });
    },
    onSuccess: result => { void client.invalidateQueries({ queryKey: ["my-skills"] }); setNotice("revision" in result ? `Evidence saved. Keep this ID for skill links or review: ${result.id}` : `Review submitted for evidence revision ${result.evidence_revision}.`); close(); },
  });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(undefined); setNotice(""); save.mutate(new FormData(event.currentTarget), { onError: setError }); }
  const reviewer = organizations.data?.filter(org => org.approved && (org.role === "reviewer" || org.role === "admin")) ?? [];
  const description = mode === "create" ? "URLs must be valid absolute URLs. Evidence is represented by its source, title, optional external ID, URL, and data object." : mode === "edit" ? "Updating evidence resets its verification status and invalidates older verified revisions." : "You must be an approved reviewer or admin in the selected organization, and the learner must belong to or have shared scope with it.";
  const title = mode === "create" ? "Add evidence" : mode === "edit" ? "Update evidence" : "Review evidence";
  return <div><PageHeader eyebrow="Supporting proof" title="Evidence" description="Evidence is ID-based because the backend has no evidence list endpoint. Create, update, and review known evidence IDs without implying a browseable collection." action={<div className="action-pair"><Button variant="quiet" onClick={() => { setError(undefined); setMode("edit"); }}><Pencil size={16}/> Update by ID</Button><Button variant="secondary" onClick={() => { setError(undefined); setMode("review"); }} disabled={!reviewer.length}>Review evidence</Button><Button onClick={() => { setError(undefined); setMode("create"); }}><Plus size={16}/> Add evidence</Button></div>}/><Panel className="evidence-note"><FileCheck2 size={23}/><div><h2>Evidence is ID-based in the current API</h2><p>Create returns an evidence ID. Keep it if you need to link it to a skill, update it, or submit it for an eligible review. A collection/list view is not possible until the backend exposes an evidence listing endpoint.</p><Status tone={reviewer.length ? "success" : "warning"}>{reviewer.length ? "Reviewer access available" : "No reviewer access"}</Status></div></Panel>{notice && <p className="notice evidence-success">{notice}</p>}{mode && <Dialog title={title} onClose={close}><form onSubmit={submit}><h2>{title}</h2><p>{description}</p>{mode === "review" ? <div className="stack modal-fields"><Field label="Evidence ID" error={fieldError(error, "evidenceId")}><input name="evidenceId" required/></Field><Field label="Organization" error={fieldError(error, "organization_id")}><select name="organizationId" required><option value="">Select an organization</option>{reviewer.map(org => <option value={org.id} key={org.id}>{org.name}</option>)}</select></Field><Field label="Decision" error={fieldError(error, "status")}><select name="status"><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="revoked">Revoked</option></select></Field><Field label="Note" hint="Optional" error={fieldError(error, "note")}><textarea name="note"/></Field></div> : <div className="stack modal-fields">{mode === "edit" && <Field label="Evidence ID" error={fieldError(error, "evidenceId")}><input name="evidenceId" required/></Field>}<Field label="Title" error={fieldError(error, "title")}><input name="title" maxLength={300} required/></Field><Field label="Source" error={fieldError(error, "source")}><input name="source" maxLength={50} required placeholder="e.g. github"/></Field><Field label="External ID" hint="Optional" error={fieldError(error, "external_id")}><input name="externalId" maxLength={500}/></Field><Field label="URL" hint="Optional" error={fieldError(error, "url")}><input name="url" type="url" placeholder="https://…"/></Field></div>}{error && <p className="form-error">{formatError(error)}</p>}<div className="form-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : mode === "create" ? "Add evidence" : mode === "edit" ? "Update evidence" : "Submit review"}</Button></div></form></Dialog>}</div>;
}
