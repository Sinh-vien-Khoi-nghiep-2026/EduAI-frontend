import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, GraduationCap, Plus, Search } from "lucide-react";
import { type FormEvent, useDeferredValue, useState } from "react";
import { arbor, type Skill, type SkillCreateInput, type SkillUpdateInput } from "@/api/arbor";
import { ApiError } from "@/api/client";
import { capabilitiesFor, decodeClaims } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import {
  buildSkillTree,
  countSkills,
  parentOptionsFor,
  validateSkillPath,
  validateStableId,
  visibleRows,
} from "@/features/taxonomy";
import {
  Button,
  Dialog,
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

function updateErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "cannot_parent_self") return "A skill cannot be its own parent.";
    if (error.code === "parent_not_found") return "Selected parent skill was not found.";
    if (error.code === "taxonomy_cycle") return "Selecting this parent would create a cycle.";
    if (error.code === "invalid_taxonomy_identifier") return "Invalid taxonomy identifier or path.";
    if (error.code === "skill_not_found") return "Skill not found.";
  }
  return formatError(error);
}

function deleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "skill_has_children" || error.message.includes("skill_has_children")) {
      return "This skill has child skills. Move or delete them first.";
    }
    if (error.code === "skill_in_use" || error.message.includes("skill_in_use")) {
      return "Learners have recorded progress against this skill, so it cannot be deleted.";
    }
    if (error.code === "skill_not_found") {
      return "Skill not found.";
    }
  }
  return formatError(error);
}

export default function AdminTaxonomy() {
  const { token } = useSession();
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Create state
  const [creating, setCreating] = useState(false);
  const [createStableId, setCreateStableId] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPath, setCreatePath] = useState("");
  const [createParentId, setCreateParentId] = useState("");
  const [createFormError, setCreateFormError] = useState<Error>();

  // Edit state
  const [editing, setEditing] = useState<Skill | null>(null);
  const [editName, setEditName] = useState("");
  const [editPath, setEditPath] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editFormError, setEditFormError] = useState<Error>();

  // Delete state
  const [deleting, setDeleting] = useState<Skill | null>(null);
  const [deleteFormError, setDeleteFormError] = useState<Error>();

  const deferredQuery = useDeferredValue(query);

  const organizations = useQuery({ queryKey: ["organizations"], queryFn: () => arbor.organizations(token!) });
  const skills = useQuery({ queryKey: ["skills"], queryFn: arbor.skills });
  const canWrite = capabilitiesFor(decodeClaims(token), organizations.data).has("taxonomy.write");

  const closeCreate = () => {
    setCreating(false);
    setCreateStableId("");
    setCreateName("");
    setCreatePath("");
    setCreateParentId("");
    setCreateFormError(undefined);
  };

  const openCreate = (defaultParentId = "") => {
    setNotice(null);
    setInlineError(null);
    setCreateStableId("");
    setCreateName("");
    setCreatePath("");
    setCreateParentId(defaultParentId);
    setCreateFormError(undefined);
    setCreating(true);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditName("");
    setEditPath("");
    setEditParentId("");
    setEditFormError(undefined);
  };

  const openEdit = (skill: Skill) => {
    setNotice(null);
    setInlineError(null);
    setSelectedId(skill.id);
    setEditing(skill);
    setEditName(skill.name);
    setEditPath(skill.path ?? "");
    setEditParentId(skill.parent_id ?? "");
    setEditFormError(undefined);
  };

  const closeDelete = () => {
    setDeleting(null);
    setDeleteFormError(undefined);
  };

  const openDelete = (skill: Skill) => {
    setNotice(null);
    setInlineError(null);
    setSelectedId(skill.id);
    setDeleting(skill);
    setDeleteFormError(undefined);
  };

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const create = useMutation({
    mutationFn: (body: SkillCreateInput) => arbor.createSkill(token!, body),
    onSuccess: data => {
      void client.invalidateQueries({ queryKey: ["skills"] });
      if (data?.id) setSelectedId(data.id);
      setNotice(`Skill “${createName.trim()}” created successfully.`);
      setInlineError(null);
      closeCreate();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: SkillUpdateInput }) =>
      arbor.updateSkill(token!, id, body),
    onSuccess: updated => {
      void client.invalidateQueries({ queryKey: ["skills"] });
      setSelectedId(updated.id);
      setNotice(`Skill “${updated.name}” updated successfully.`);
      setInlineError(null);
      closeEdit();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => arbor.deleteSkill(token!, id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["skills"] });
      if (deleting && selectedId === deleting.id) setSelectedId(null);
      setNotice("Skill deleted successfully.");
      setInlineError(null);
      closeDelete();
    },
  });

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateFormError(undefined);
    const idError = validateStableId(createStableId);
    if (idError) { setCreateFormError(new Error(`Stable ID: ${idError}`)); return; }
    const pathError = validateSkillPath(createPath);
    if (pathError) { setCreateFormError(new Error(`Path: ${pathError}`)); return; }
    if (!createName.trim()) { setCreateFormError(new Error("A display name is required.")); return; }
    create.mutate(
      {
        stable_id: createStableId.trim(),
        name: createName.trim(),
        path: createPath.trim(),
        parent_id: createParentId || null,
      },
      { onError: setCreateFormError },
    );
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setEditFormError(undefined);
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditFormError(new Error("A display name is required."));
      return;
    }
    if (trimmedName.length > 200) {
      setEditFormError(new Error("Display name must be 200 characters or fewer."));
      return;
    }
    const trimmedPath = editPath.trim();
    const pathError = validateSkillPath(trimmedPath);
    if (pathError) {
      setEditFormError(new Error(`Path: ${pathError}`));
      return;
    }

    const patch: SkillUpdateInput = {};
    if (trimmedName !== editing.name) patch.name = trimmedName;
    if (trimmedPath !== (editing.path ?? "")) patch.path = trimmedPath;
    const nextParent = editParentId || null;
    const prevParent = editing.parent_id ?? null;
    if (nextParent !== prevParent) patch.parent_id = nextParent;

    if (Object.keys(patch).length === 0) {
      closeEdit();
      return;
    }

    update.mutate(
      { id: editing.id, body: patch },
      { onError: setEditFormError },
    );
  }

  function submitDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deleting) return;
    setDeleteFormError(undefined);
    remove.mutate(deleting.id, {
      onError: setDeleteFormError,
    });
  }

  if (skills.isLoading) return <LoadingBlock label="Loading the skill taxonomy…" />;
  if (skills.isError) {
    return <ErrorBlock message={formatError(skills.error)} retry={() => void skills.refetch()} />;
  }

  const all = skills.data ?? [];
  const rows = buildSkillTree(all, deferredQuery);
  const visible = visibleRows(rows, collapsed, deferredQuery);
  const counts = countSkills(all);
  const hasChildSkills = (id: string) => all.some(item => item.parent_id === id);

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Platform capability"
        title="Skill taxonomy"
        description="The shared taxonomy every learner records progress against. Creating a skill writes to the platform-wide list."
        action={
          canWrite && (
            <Button onClick={() => openCreate("")}>
              <Plus size={16} /> New skill
            </Button>
          )
        }
      />

      <Panel className="admin-toolbar">
        <label className="admin-search">
          <Search size={16} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Filter by name or stable ID"
            aria-label="Filter taxonomy skills"
          />
        </label>
        <div className="admin-toolbar-meta">
          <Status tone="neutral">{counts.total} skills</Status>
          <Status tone="neutral">{counts.roots} root nodes</Status>
          <Status tone={canWrite ? "success" : "warning"}>
            {canWrite ? "Authoring enabled" : "Read only"}
          </Status>
        </div>
      </Panel>

      {notice && <p className="notice">{notice}</p>}
      {inlineError && <p className="form-error">{inlineError}</p>}

      <Panel>
        {visible.length === 0 ? (
          <EmptyBlock
            title={deferredQuery ? "No skills match that filter" : "No skills published yet"}
            description={
              deferredQuery
                ? "Clear the filter to see the full taxonomy."
                : canWrite
                  ? "Create the first taxonomy entry to let learners record progress."
                  : "A platform administrator must publish taxonomy entries before progress can be recorded."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th scope="col">Skill</th>
                  <th scope="col">Stable ID</th>
                  <th scope="col">Path</th>
                  <th scope="col">Parent</th>
                  <th scope="col">Identifier</th>
                  {canWrite && <th scope="col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map(skill => {
                  const hasChildren = hasChildSkills(skill.id);
                  const isCollapsed = collapsed.has(skill.id);
                  return (
                    <tr
                      key={skill.id}
                      onClick={() => setSelectedId(skill.id)}
                      style={{
                        backgroundColor: skill.id === selectedId ? "#f3f9f4" : undefined,
                      }}
                    >
                      <td data-label="Skill">
                        <span
                          className="admin-tree-name"
                          style={{ paddingInlineStart: `${skill.depth * 18}px` }}
                        >
                          {skill.depth > 0 && <span className="admin-tree-elbow" aria-hidden />}
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={event => {
                                event.stopPropagation();
                                toggleCollapse(skill.id);
                              }}
                              style={{
                                background: "none",
                                border: 0,
                                padding: 0,
                                margin: 0,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#5c8b72",
                              }}
                              aria-label={isCollapsed ? `Expand ${skill.name}` : `Collapse ${skill.name}`}
                            >
                              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            </button>
                          ) : (
                            <span style={{ width: 14, height: 14, flex: "0 0 auto" }} aria-hidden />
                          )}
                          <GraduationCap size={14} aria-hidden />
                          <strong>{skill.name}</strong>
                        </span>
                      </td>
                      <td data-label="Stable ID">
                        <code className="admin-code">{skill.stable_id}</code>
                      </td>
                      <td data-label="Path">
                        {skill.path ? (
                          <span className="admin-ellipsis muted" title={skill.path}>
                            {skill.path}
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td data-label="Parent">
                        {skill.parent_id ? (
                          <code className="admin-code muted">
                            {all.find(item => item.id === skill.parent_id)?.stable_id ?? skill.parent_id}
                          </code>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td data-label="Identifier">
                        <code className="admin-code muted admin-ellipsis">{skill.id}</code>
                      </td>
                      {canWrite && (
                        <td data-label="Actions">
                          <span className="admin-row-actions">
                            <button
                              type="button"
                              className="admin-link-button"
                              onClick={event => {
                                event.stopPropagation();
                                openEdit(skill);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="admin-link-button"
                              onClick={event => {
                                event.stopPropagation();
                                openCreate(skill.id);
                              }}
                            >
                              Add child
                            </button>
                            <button
                              type="button"
                              className="admin-link-button admin-link-danger"
                              disabled={hasChildren}
                              title={
                                hasChildren
                                  ? "This skill has child skills. Move or delete them first."
                                  : undefined
                              }
                              onClick={event => {
                                event.stopPropagation();
                                openDelete(skill);
                              }}
                            >
                              Delete
                            </button>
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {creating && (
        <Dialog title="New taxonomy skill" onClose={closeCreate} dismissible={!create.isPending}>
          <form onSubmit={submitCreate}>
            <h2>New taxonomy skill</h2>
            <p>
              The stable ID is permanent and is what learners and recruiters match against. Duplicates
              are rejected with 409 <code>skill_exists</code>.
            </p>
            <div className="stack modal-fields">
              <Field
                label="Stable ID"
                hint="Lowercase letters, digits, dots, underscores, hyphens"
                error={fieldError(createFormError, "stable_id")}
              >
                <input
                  value={createStableId}
                  onChange={event => setCreateStableId(event.target.value)}
                  maxLength={150}
                  required
                  autoComplete="off"
                  placeholder="e.g. typescript.react"
                />
              </Field>
              <Field label="Display name" error={fieldError(createFormError, "name")}>
                <input
                  value={createName}
                  onChange={event => setCreateName(event.target.value)}
                  maxLength={200}
                  required
                />
              </Field>
              <Field
                label="Path"
                hint="Optional slash-separated grouping, e.g. languages/typescript"
                error={fieldError(createFormError, "path")}
              >
                <input
                  value={createPath}
                  onChange={event => setCreatePath(event.target.value)}
                  maxLength={500}
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Parent skill"
                hint="Optional"
                error={fieldError(createFormError, "parent_id")}
              >
                <select
                  value={createParentId}
                  onChange={event => setCreateParentId(event.target.value)}
                >
                  <option value="">No parent</option>
                  {parentOptionsFor(all, null).map(skill => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name} ({skill.stable_id})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {createFormError && <p className="form-error">{formatError(createFormError)}</p>}
            <div className="form-actions">
              <Button variant="secondary" onClick={closeCreate} disabled={create.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create skill"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {editing && (
        <Dialog title="Edit skill" onClose={closeEdit} dismissible={!update.isPending}>
          <form onSubmit={submitEdit}>
            <h2>Edit skill</h2>
            <div className="stack modal-fields">
              <Field
                label="Stable ID"
                hint="Permanent identifier. Immutable because learner progress, candidate-search criteria, and ObjectTree nodes reference it."
              >
                <input
                  value={editing.stable_id}
                  disabled
                  readOnly
                  aria-readonly="true"
                />
              </Field>
              <Field label="Display name" error={fieldError(editFormError, "name")}>
                <input
                  value={editName}
                  onChange={event => setEditName(event.target.value)}
                  maxLength={200}
                  required
                />
              </Field>
              <Field
                label="Path"
                hint="Optional slash-separated grouping, e.g. languages/typescript"
                error={fieldError(editFormError, "path")}
              >
                <input
                  value={editPath}
                  onChange={event => setEditPath(event.target.value)}
                  maxLength={500}
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Parent skill"
                hint="Optional — cannot be the skill itself or any of its descendants"
                error={fieldError(editFormError, "parent_id")}
              >
                <select
                  value={editParentId}
                  onChange={event => setEditParentId(event.target.value)}
                >
                  <option value="">No parent</option>
                  {parentOptionsFor(all, editing.id).map(skill => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name} ({skill.stable_id})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {editFormError && (
              <p className="form-error">{updateErrorMessage(editFormError)}</p>
            )}
            <div className="form-actions">
              <Button
                variant="secondary"
                onClick={closeEdit}
                disabled={update.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {deleting && (
        <Dialog
          title={hasChildSkills(deleting.id) ? "Cannot delete skill" : "Delete skill"}
          onClose={closeDelete}
          dismissible={!remove.isPending}
        >
          {hasChildSkills(deleting.id) ? (
            <div>
              <h2>Cannot delete skill</h2>
              <p>This skill has child skills. Move or delete them first.</p>
              <div className="form-actions" style={{ marginTop: "20px" }}>
                <Button variant="secondary" onClick={closeDelete}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submitDelete}>
              <h2>Delete skill</h2>
              <p>
                Are you sure you want to delete <strong>{deleting.name}</strong> (
                <code className="admin-code">{deleting.stable_id}</code>)?
              </p>
              {deleteFormError && (
                <p className="form-error">{deleteErrorMessage(deleteFormError)}</p>
              )}
              <div className="form-actions">
                <Button
                  variant="secondary"
                  onClick={closeDelete}
                  disabled={remove.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="submit"
                  disabled={remove.isPending}
                >
                  {remove.isPending ? "Deleting…" : "Delete skill"}
                </Button>
              </div>
            </form>
          )}
        </Dialog>
      )}
    </div>
  );
}
