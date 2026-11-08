import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, FileCheck2, Pencil, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { arbor, type EvidenceCreated, type EvidenceInput, type EvidencePatchInput, type EvidenceReview, type StudentEvidence } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { Button, Dialog, EmptyBlock, ErrorBlock, Field, fieldError, formatError, LoadingBlock, PageHeader, Panel, Status } from "@/components/app-ui";
import { buildEvidencePatch, type EvidenceEditSnapshot } from "@/features/evidence";

type EvidenceMode = "create" | "edit" | "review" | null;
type EvidenceResult = EvidenceCreated | EvidenceReview;

export default function Evidence() {
  const { token } = useSession();
  const client = useQueryClient();
  const [mode, setMode] = useState<EvidenceMode>(null);
  const [error, setError] = useState<Error>();
  const [notice, setNotice] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Edit pre-fill state
  const [editId, setEditId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editExternalId, setEditExternalId] = useState("");
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);
  const [editSnapshot, setEditSnapshot] = useState<EvidenceEditSnapshot | null>(null);

  const organizations = useQuery({ queryKey: ["organizations"], queryFn: () => arbor.organizations(token!) });
  const myEvidenceQuery = useQuery({
    queryKey: ["my-evidence", token],
    queryFn: () => arbor.myEvidence(token!),
    enabled: Boolean(token),
  });

  const close = () => {
    setMode(null);
    setError(undefined);
    setEditId("");
    setEditTitle("");
    setEditSource("");
    setEditUrl("");
    setEditExternalId("");
    setEditData(null);
    setEditSnapshot(null);
  };

  const openCreate = () => {
    setError(undefined);
    setEditId("");
    setEditTitle("");
    setEditSource("");
    setEditUrl("");
    setEditExternalId("");
    setEditData(null);
    setEditSnapshot(null);
    setMode("create");
  };

  const openEditRow = (item: StudentEvidence) => {
    setError(undefined);
    setEditId(item.id);
    setEditTitle(item.title);
    setEditSource(item.source);
    setEditUrl(item.url ?? "");
    setEditExternalId(item.external_id ?? "");
    setEditData(item.data ?? {});
    setEditSnapshot({
      source: item.source,
      title: item.title,
      url: item.url ?? "",
      external_id: item.external_id ?? "",
      data: item.data ?? {},
    });
    setMode("edit");
  };

  const openEditManual = () => {
    setError(undefined);
    setEditId("");
    setEditTitle("");
    setEditSource("");
    setEditUrl("");
    setEditExternalId("");
    setEditData(null);
    setEditSnapshot(null);
    setMode("edit");
  };

  const openReview = () => {
    setError(undefined);
    setMode("review");
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setCopyError(null);
      setTimeout(() => {
        setCopiedId(prev => (prev === id ? null : prev));
      }, 2000);
    } catch (cause) {
      setCopiedId(null);
      setCopyError(`Clipboard copy failed: ${formatError(cause)}`);
      setTimeout(() => {
        setCopyError(null);
      }, 3000);
    }
  };

  const save = useMutation<EvidenceResult | { noop: true }, Error, FormData>({
    mutationFn: async (data: FormData) => {
      const values = {
        source: String(data.get("source")),
        title: String(data.get("title")),
        url: String(data.get("url")),
        external_id: String(data.get("externalId")),
      };
      if (mode === "create") {
        const evidence: EvidenceInput = {
          source: values.source.trim(),
          external_id: values.external_id.trim() || undefined,
          url: values.url.trim() || undefined,
          title: values.title.trim(),
          data: editData ?? {},
        };
        return arbor.createEvidence(token!, evidence);
      }
      const evidenceId = String(data.get("evidenceId")).trim();
      if (!evidenceId) throw new Error("Enter an evidence ID.");
      if (mode === "edit") {
        const patch: EvidencePatchInput = buildEvidencePatch(values, editSnapshot, editData);
        // Row edit knows the original, so an empty patch means the user changed
        // nothing. Sending it would still bump the revision server-side and
        // invalidate an existing verification, so do not send it at all.
        if (Object.keys(patch).length === 0) return { noop: true };
        return arbor.updateEvidence(token!, evidenceId, patch);
      }
      const status = String(data.get("status"));
      if (status !== "verified" && status !== "rejected" && status !== "revoked") throw new Error("Choose a valid review decision.");
      return arbor.reviewEvidence(token!, evidenceId, {
        organization_id: String(data.get("organizationId")),
        status,
        note: String(data.get("note")).trim() || undefined,
      });
    },
    onSuccess: result => {
      if ("noop" in result) {
        close();
        setNotice("Nothing to update.");
        return;
      }
      void client.invalidateQueries({ queryKey: ["my-skills"] });
      void client.invalidateQueries({ queryKey: ["my-evidence", token] });
      setNotice("revision" in result ? `Evidence saved. Keep this ID for skill links or review: ${result.id}` : `Review submitted for evidence revision ${result.evidence_revision}.`);
      close();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setNotice("");
    save.mutate(new FormData(event.currentTarget), { onError: setError });
  }

  const reviewer = organizations.data?.filter(org => org.approved && (org.role === "reviewer" || org.role === "admin")) ?? [];
  // Row edit loaded a snapshot, so its id is pinned to that row; manual mode
  // has no snapshot and is the only place the user may type an id.
  const isRowEdit = mode === "edit" && editSnapshot !== null;
  const isManualEdit = mode === "edit" && editSnapshot === null;
  const description = mode === "create"
    ? "URLs must be valid absolute URLs. Evidence is represented by its source, title, optional external ID, URL, and data object."
    : mode === "edit"
      ? isManualEdit
        ? "Updating by ID applies only the fields shown here; stored metadata you do not see is left untouched. Updating evidence resets its verification status."
        : "Updating evidence resets its verification status and invalidates older verified revisions."
      : "You must be an approved reviewer or admin in the selected organization, and the learner must belong to or have shared scope with it.";
  const title = mode === "create" ? "Add evidence" : mode === "edit" ? "Update evidence" : "Review evidence";

  const statusTone = (status: string): "success" | "danger" | "warning" | "neutral" => {
    if (status === "verified") return "success";
    if (status === "rejected") return "danger";
    if (status === "revoked") return "warning";
    return "neutral";
  };

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Supporting proof"
        title="Evidence"
        description="Submit, update, and manage evidence supporting your skills and achievements."
        action={
          <div className="action-pair">
            <Button variant="quiet" onClick={openEditManual}>
              <Pencil size={16} /> Update by ID
            </Button>
            <Button variant="secondary" onClick={openReview} disabled={!reviewer.length}>
              Review evidence
            </Button>
            <Button onClick={openCreate}>
              <Plus size={16} /> Add evidence
            </Button>
          </div>
        }
      />

      <Panel className="evidence-note">
        <FileCheck2 size={23} />
        <div>
          <h2>Evidence is verified by reviewers</h2>
          <p>
            Create returns an evidence ID. Keep it if you need to link it to a skill, update it, or submit it for an eligible review.
          </p>
          <Status tone={reviewer.length ? "success" : "warning"}>
            {reviewer.length ? "Reviewer access available" : "No reviewer access"}
          </Status>
        </div>
      </Panel>

      {notice && <p className="notice evidence-success">{notice}</p>}
      {copyError && <p className="form-error">{copyError}</p>}

      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 className="section-title" style={{ margin: 0 }}>My Evidence</h2>
          <Button variant="quiet" onClick={() => void myEvidenceQuery.refetch()} disabled={myEvidenceQuery.isFetching}>
            Refresh
          </Button>
        </div>

        {myEvidenceQuery.isLoading && <LoadingBlock label="Loading your evidence…" />}
        {myEvidenceQuery.isError && (
          <ErrorBlock message={formatError(myEvidenceQuery.error)} retry={() => void myEvidenceQuery.refetch()} />
        )}
        {myEvidenceQuery.data && (
          myEvidenceQuery.data.length === 0 ? (
            <EmptyBlock
              title="No evidence submitted yet."
              description="Submit evidence using the Add evidence button above to back your skills with verified proof."
              action={
                <Button onClick={openCreate}>
                  <Plus size={16} /> Add evidence
                </Button>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="data-table admin-table">
                <thead>
                  <tr>
                    <th>Title & URL</th>
                    <th>ID</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Rev</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myEvidenceQuery.data.map(item => (
                    <tr key={item.id}>
                      <td style={{ minWidth: 220 }}>
                        <div style={{ fontWeight: 600, wordBreak: "break-word" }}>{item.title}</div>
                        {item.url && (
                          <div style={{ marginTop: 4 }}>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="admin-link-button"
                              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              <span>{item.url}</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                      </td>
                      <td style={{ minWidth: 260 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <code
                            className="admin-code"
                            style={{ userSelect: "all", fontSize: 11, wordBreak: "break-all" }}
                          >
                            {item.id}
                          </code>
                          <Button
                            variant="quiet"
                            aria-label={`Copy evidence ID ${item.id}`}
                            onClick={() => void copyId(item.id)}
                            style={{ padding: "2px 6px", height: "auto", fontSize: 11 }}
                          >
                            {copiedId === item.id ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#1f6a4b" }}>
                                <Check size={12} /> Copied
                              </span>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <Copy size={12} /> Copy
                              </span>
                            )}
                          </Button>
                        </div>
                      </td>
                      <td>
                        <span className="admin-code">{item.source}</span>
                      </td>
                      <td>
                        <Status tone={statusTone(item.status)}>{item.status}</Status>
                      </td>
                      <td>
                        <span>r{item.revision}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Button
                          variant="secondary"
                          onClick={() => openEditRow(item)}
                          style={{ padding: "4px 8px", fontSize: 12 }}
                        >
                          <Pencil size={13} /> Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Panel>

      {mode && (
        <Dialog title={title} onClose={close} dismissible={!save.isPending}>
          <form onSubmit={submit}>
            <h2>{title}</h2>
            <p>{description}</p>
            {mode === "review" ? (
              <div className="stack modal-fields">
                <Field label="Evidence ID" error={fieldError(error, "evidenceId")}>
                  <input name="evidenceId" required />
                </Field>
                <Field label="Organization" error={fieldError(error, "organization_id")}>
                  <select name="organizationId" required>
                    <option value="">Select an organization</option>
                    {reviewer.map(org => (
                      <option value={org.id} key={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Decision" error={fieldError(error, "status")}>
                  <select name="status">
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </Field>
                <Field label="Note" hint="Optional" error={fieldError(error, "note")}>
                  <textarea name="note" />
                </Field>
              </div>
            ) : (
              <div className="stack modal-fields">
                {mode === "edit" && (
                  <Field
                    label="Evidence ID"
                    hint={isRowEdit ? "Locked to the row this dialog was opened from." : undefined}
                    error={fieldError(error, "evidenceId")}
                  >
                    <input
                      name="evidenceId"
                      required
                      value={editId}
                      readOnly={isRowEdit}
                      aria-readonly={isRowEdit || undefined}
                      // Row edit must patch the record it was opened from, or a
                      // retyped id would overwrite a different, unopened record.
                      onChange={e => { if (!isRowEdit) setEditId(e.target.value); }}
                      style={isRowEdit ? { background: "#eef3ef", color: "#5b6d62", cursor: "not-allowed" } : undefined}
                    />
                  </Field>
                )}
                <Field label="Title" error={fieldError(error, "title")}>
                  <input
                    name="title"
                    maxLength={300}
                    required
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                  />
                </Field>
                <Field label="Source" error={fieldError(error, "source")}>
                  <input
                    name="source"
                    maxLength={50}
                    required
                    placeholder="e.g. github"
                    value={editSource}
                    onChange={e => setEditSource(e.target.value)}
                  />
                </Field>
                <Field label="External ID" hint="Optional" error={fieldError(error, "external_id")}>
                  <input
                    name="externalId"
                    maxLength={500}
                    value={editExternalId}
                    onChange={e => setEditExternalId(e.target.value)}
                  />
                </Field>
                <Field label="URL" hint="Optional" error={fieldError(error, "url")}>
                  <input
                    name="url"
                    type="url"
                    placeholder="https://…"
                    value={editUrl}
                    onChange={e => setEditUrl(e.target.value)}
                  />
                </Field>
              </div>
            )}
            {error && <p className="form-error">{formatError(error)}</p>}
            <div className="form-actions">
              <Button variant="secondary" onClick={close} disabled={save.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : mode === "create" ? "Add evidence" : mode === "edit" ? "Update evidence" : "Submit review"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
