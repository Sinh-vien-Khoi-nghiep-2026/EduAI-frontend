import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { arbor } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { Button, Dialog, EmptyBlock, ErrorBlock, Field, fieldError, formatError, LoadingBlock, PageHeader, Panel, Status } from "@/components/app-ui";

type SkillInput = { skill_id: string; level: number; evidence_id?: string };

export default function Skills() {
  const { token } = useSession();
  const client = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [remove, setRemove] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [level, setLevel] = useState("5");
  const [evidenceId, setEvidenceId] = useState("");
  const [error, setError] = useState<Error>();
  const taxonomy = useQuery({ queryKey: ["skills"], queryFn: arbor.skills });
  const mine = useQuery({ queryKey: ["my-skills"], queryFn: () => arbor.mySkills(token!) });
  const closeAdd = () => { setAdding(false); setSelected(""); setLevel("5"); setEvidenceId(""); setError(undefined); };
  const closeRemove = () => setRemove(null);
  const save = useMutation({ mutationFn: (body: SkillInput) => arbor.saveSkill(token!, body), onSuccess: () => { void client.invalidateQueries({ queryKey: ["my-skills"] }); void client.invalidateQueries({ queryKey: ["skill-tree"] }); closeAdd(); } });
  const drop = useMutation({ mutationFn: (id: string) => arbor.removeSkill(token!, id), onSuccess: () => { void client.invalidateQueries({ queryKey: ["my-skills"] }); void client.invalidateQueries({ queryKey: ["skill-tree"] }); closeRemove(); } });
  function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    const skill_id = selected.trim();
    const parsedLevel = Number(level);
    if (!skill_id) { setError(new Error("Choose a skill from the published taxonomy.")); return; }
    if (!Number.isInteger(parsedLevel) || parsedLevel < 0 || parsedLevel > 10) { setError(new Error("Level must be a whole number from 0 to 10.")); return; }
    const evidence_id = evidenceId.trim();
    save.mutate({ skill_id, level: parsedLevel, ...(evidence_id ? { evidence_id } : {}) }, { onError: setError });
  }
  if (taxonomy.isLoading || mine.isLoading) return <LoadingBlock label="Loading skills…"/>;
  if (taxonomy.isError || mine.isError) return <ErrorBlock message="Your skills could not be loaded." retry={() => void Promise.all([taxonomy.refetch(), mine.refetch()])}/>;
  const tracked = new Set(mine.data?.nodes.map(item => item.stable_id));
  return <div><PageHeader eyebrow="Capability profile" title="Skills" description="Record your level against the shared taxonomy. Adding or changing a level updates your profile immediately; the versioned tree is reconciled in the background." action={<Button onClick={() => { setError(undefined); setAdding(true); }}><Plus size={16}/> Add skill</Button>}/><Panel>{mine.data?.nodes.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Skill</th><th>Level</th><th>Verification</th><th/></tr></thead><tbody>{mine.data.nodes.map(item => <tr key={item.stable_id}><td data-label="Skill"><strong>{item.name}</strong><span className="muted">{item.stable_id}</span></td><td data-label="Level"><span className="level-pill">{item.level} / 10</span></td><td data-label="Verification"><Status tone={item.status === "verified" ? "success" : "neutral"}>{item.status.replaceAll("_", " ")}</Status></td><td data-label="Action"><Button variant="quiet" className="icon-danger" aria-label={`Remove ${item.name}`} onClick={() => setRemove(item.stable_id)}><Trash2 size={16}/></Button></td></tr>)}</tbody></table></div> : <EmptyBlock title="No skills tracked" description="Add a skill from the published taxonomy to begin your profile." action={<Button onClick={() => { setError(undefined); setAdding(true); }}>Add skill</Button>}/>}</Panel>{adding && <Dialog title="Add or update a skill" onClose={closeAdd}><form onSubmit={submit}><h2>Add or update a skill</h2><p>Choose an existing taxonomy skill and set a level from 0 to 10. You may optionally link a known evidence ID.</p><div className="stack modal-fields"><Field label="Skill" error={fieldError(error, "skill_id") ?? (error instanceof Error && !selected ? error.message : undefined)}><select value={selected} onChange={event => setSelected(event.target.value)} required><option value="">Select a skill</option>{taxonomy.data?.map(item => <option key={item.id} value={item.stable_id}>{item.name} · {item.stable_id}{tracked.has(item.stable_id) ? " (currently tracked)" : ""}</option>)}</select></Field><Field label="Level" error={fieldError(error, "level")}><input type="number" min="0" max="10" step="1" required value={level} onChange={event => setLevel(event.target.value)}/></Field><Field label="Evidence ID" hint="Optional — use the ID returned when evidence is created." error={fieldError(error, "evidence_id")}><input value={evidenceId} onChange={event => setEvidenceId(event.target.value)} placeholder="UUID"/></Field></div>{error && <p className="form-error">{formatError(error)}</p>}<div className="form-actions"><Button variant="secondary" onClick={closeAdd}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save skill"}</Button></div></form></Dialog>}{remove && <Dialog title="Remove this skill?" onClose={closeRemove} dismissible={!drop.isPending}><h2>Remove this skill?</h2><p>This removes the skill level from your profile and queues reconciliation of your versioned skill tree.</p><div className="form-actions"><Button variant="secondary" onClick={closeRemove} disabled={drop.isPending}>Cancel</Button><Button variant="danger" onClick={() => drop.mutate(remove)} disabled={drop.isPending}>{drop.isPending ? "Removing…" : "Remove skill"}</Button></div></Dialog>}</div>;
}
