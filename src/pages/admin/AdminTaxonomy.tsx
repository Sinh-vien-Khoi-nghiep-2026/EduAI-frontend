import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Plus, Search } from "lucide-react";
import { type FormEvent, useDeferredValue, useState } from "react";
import { arbor, type SkillCreateInput } from "@/api/arbor";
import { capabilitiesFor, decodeClaims } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import {
  buildSkillTree,
  countSkills,
  validateSkillPath,
  validateStableId,
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

export default function AdminTaxonomy() {
  const { token } = useSession();
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [stableId, setStableId] = useState("");
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [parentId, setParentId] = useState("");
  const [formError, setFormError] = useState<Error>();
  const deferredQuery = useDeferredValue(query);

  const organizations = useQuery({ queryKey: ["organizations"], queryFn: () => arbor.organizations(token!) });
  const skills = useQuery({ queryKey: ["skills"], queryFn: arbor.skills });
  const canWrite = capabilitiesFor(decodeClaims(token), organizations.data).has("taxonomy.write");

  const close = () => {
    setCreating(false);
    setStableId("");
    setName("");
    setPath("");
    setParentId("");
    setFormError(undefined);
  };

  const create = useMutation({
    mutationFn: (body: SkillCreateInput) => arbor.createSkill(token!, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["skills"] });
      close();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    const idError = validateStableId(stableId);
    if (idError) { setFormError(new Error(`Stable ID: ${idError}`)); return; }
    const pathError = validateSkillPath(path);
    if (pathError) { setFormError(new Error(`Path: ${pathError}`)); return; }
    if (!name.trim()) { setFormError(new Error("A display name is required.")); return; }
    create.mutate(
      {
        stable_id: stableId.trim(),
        name: name.trim(),
        path: path.trim(),
        parent_id: parentId || null,
      },
      { onError: setFormError },
    );
  }

  if (skills.isLoading) return <LoadingBlock label="Loading the skill taxonomy…" />;
  if (skills.isError) {
    return <ErrorBlock message={formatError(skills.error)} retry={() => void skills.refetch()} />;
  }

  const all = skills.data ?? [];
  const rows = buildSkillTree(all, deferredQuery);
  const counts = countSkills(all);
  const parentOptions = [...all].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Platform capability"
        title="Skill taxonomy"
        description="The shared taxonomy every learner records progress against. Creating a skill writes to the platform-wide list."
        action={
          canWrite && (
            <Button onClick={() => { setFormError(undefined); setCreating(true); }}>
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

      <Panel>
        {rows.length === 0 ? (
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
                  <th scope="col">Parent</th>
                  <th scope="col">Identifier</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(skill => (
                  <tr key={skill.id}>
                    <td data-label="Skill">
                      <span
                        className="admin-tree-name"
                        style={{ paddingInlineStart: `${skill.depth * 18}px` }}
                      >
                        {skill.depth > 0 && <span className="admin-tree-elbow" aria-hidden />}
                        <GraduationCap size={14} aria-hidden />
                        <strong>{skill.name}</strong>
                      </span>
                    </td>
                    <td data-label="Stable ID">
                      <code className="admin-code">{skill.stable_id}</code>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {creating && (
        <Dialog title="New taxonomy skill" onClose={close} dismissible={!create.isPending}>
          <form onSubmit={submit}>
            <h2>New taxonomy skill</h2>
            <p>
              The stable ID is permanent and is what learners and recruiters match against. Duplicates
              are rejected with 409 <code>skill_exists</code>.
            </p>
            <div className="stack modal-fields">
              <Field
                label="Stable ID"
                hint="Lowercase letters, digits, dots, underscores, hyphens"
                error={fieldError(formError, "stable_id")}
              >
                <input
                  value={stableId}
                  onChange={event => setStableId(event.target.value)}
                  maxLength={150}
                  required
                  autoComplete="off"
                  placeholder="e.g. typescript.react"
                />
              </Field>
              <Field label="Display name" error={fieldError(formError, "name")}>
                <input
                  value={name}
                  onChange={event => setName(event.target.value)}
                  maxLength={200}
                  required
                />
              </Field>
              <Field
                label="Path"
                hint="Optional slash-separated grouping, e.g. languages/typescript"
                error={fieldError(formError, "path")}
              >
                <input
                  value={path}
                  onChange={event => setPath(event.target.value)}
                  maxLength={500}
                  autoComplete="off"
                />
              </Field>
              <Field label="Parent skill" hint="Optional" error={fieldError(formError, "parent_id")}>
                <select value={parentId} onChange={event => setParentId(event.target.value)}>
                  <option value="">No parent</option>
                  {parentOptions.map(skill => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name} ({skill.stable_id})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {formError && <p className="form-error">{formatError(formError)}</p>}
            <div className="form-actions">
              <Button variant="secondary" onClick={close} disabled={create.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create skill"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
