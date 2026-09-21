import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, Pencil, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { arbor, type EvidenceCreated, type EvidenceInput, type EvidenceReview } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { Button, Field, formatError, PageHeader, Panel, Status } from "@/components/app-ui";

type EvidenceMode = "create" | "edit" | "review" | null;
type EvidenceResult = EvidenceCreated | EvidenceReview;

export default function Evidence() {
  const { token } = useSession();
  const client = useQueryClient();
  const [mode, setMode] = useState<EvidenceMode>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const organizations = useQuery({ queryKey: ["organizations"], queryFn: () => arbor.organizations(token!) });
  const save = useMutation<EvidenceResult, Error, FormData>({ mutationFn: async data => {
    const evidence: EvidenceInput = { source: String(data.get("source")).trim(), external_id: String(data.get("externalId")).trim() || undefined, url: String(data.get("url")).trim() || undefined, title: String(data.get("title")).trim(), data: {} };
    if (mode === "create") return arbor.createEvidence(token!, evidence);
    if (mode === "edit") return arbor.updateEvidence(token!, String(data.get("evidenceId")).trim(), evidence);
    const status = String(data.get("status"));
    if (status !== "verified" && status !== "rejected" && status !== "revoked") throw new Error("Choose a valid review decision.");
    return arbor.reviewEvidence(token!, String(data.get("evidenceId")).trim(), { organization_id: String(data.get("organizationId")), status, note: String(data.get("note")).trim() || undefined });
  }, onSuccess: result => { void client.invalidateQueries({ queryKey: ["my-skills"] }); setNotice("revision" in result ? `Evidence saved. Keep this ID for skill links or review: ${result.id}` : `Review submitted for evidence revision ${result.evidence_revision}.`); setMode(null); } });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); setNotice(""); save.mutate(new FormData(event.currentTarget), { onError: cause => setError(formatError(cause)) }); }
  const reviewer = organizations.data?.filter(org => org.approved && (org.role === "reviewer" || org.role === "admin")) ?? [];
  const description = mode === "create" ? "URLs must be valid absolute URLs. Evidence is represented by its source, title, optional external ID, URL, and data object." : mode === "edit" ? "Updating evidence resets its verification status and invalidates older verified revisions." : "You must be an approved reviewer or admin in the selected organization, and the learner must belong to or have shared scope with it.";
  return <div><PageHeader eyebrow="Supporting proof" title="Evidence" description="Evidence is ID-based because the backend has no evidence list endpoint. Create, update, and review known evidence IDs without implying a browseable collection." action={<div className="action-pair"><Button variant="quiet" onClick={() => setMode("edit")}><Pencil size={16}/> Update by ID</Button><Button variant="secondary" onClick={() => setMode("review")} disabled={!reviewer.length}>Review evidence</Button><Button onClick={() => setMode("create")}><Plus size={16}/> Add evidence</Button></div>}/><Panel className="evidence-note"><FileCheck2 size={23}/><div><h2>Evidence is ID-based in the current API</h2><p>Create returns an evidence ID. Keep it if you need to link it to a skill, update it, or submit it for an eligible review. A collection/list view is not possible until the backend exposes an evidence listing endpoint.</p><Status tone={reviewer.length ? "success" : "warning"}>{reviewer.length ? "Reviewer access available" : "No reviewer access"}</Status></div></Panel>{notice && <p className="notice evidence-success">{notice}</p>}{mode && <div className="modal-backdrop"><form className="modal" onSubmit={submit}><h2>{mode === "create" ? "Add evidence" : mode === "edit" ? "Update evidence" : "Review evidence"}</h2><p>{description}</p>{mode === "review" ? <div className="stack modal-fields"><Field label="Evidence ID"><input name="evidenceId" required/></Field><Field label="Organization"><select name="organizationId" required><option value="">Select an organization</option>{reviewer.map(org => <option value={org.id} key={org.id}>{org.name}</option>)}</select></Field><Field label="Decision"><select name="status"><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="revoked">Revoked</option></select></Field><Field label="Note" hint="Optional"><textarea name="note"/></Field></div> : <div className="stack modal-fields">{mode === "edit" && <Field label="Evidence ID"><input name="evidenceId" required/></Field>}<Field label="Title"><input name="title" maxLength={300} required/></Field><Field label="Source"><input name="source" maxLength={50} required placeholder="e.g. github"/></Field><Field label="External ID" hint="Optional"><input name="externalId" maxLength={500}/></Field><Field label="URL" hint="Optional"><input name="url" type="url" placeholder="https://…"/></Field></div>}{error && <p className="form-error">{error}</p>}<div className="form-actions"><Button variant="secondary" type="button" onClick={() => setMode(null)}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : mode === "create" ? "Add evidence" : mode === "edit" ? "Update evidence" : "Submit review"}</Button></div></form></div>}</div>;
}
