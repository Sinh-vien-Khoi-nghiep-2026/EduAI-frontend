import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { arbor } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { Button, Dialog, EmptyBlock, ErrorBlock, Field, fieldError, formatError, LoadingBlock, PageHeader, Panel, Status } from "@/components/app-ui";

export default function Records() {
  const { token } = useSession();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<Error>();
  const rows = useQuery({ queryKey: ["academics"], queryFn: () => arbor.academics(token!) });
  const close = () => { setOpen(false); setError(undefined); };
  const add = useMutation({ mutationFn: (body: { subject: string; term: string; original_grade: string; grading_scale: string; credits?: string }) => arbor.createAcademic(token!, body), onSuccess: () => { void client.invalidateQueries({ queryKey: ["academics"] }); close(); } });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const data = new FormData(event.currentTarget);
    add.mutate({ subject: String(data.get("subject")).trim(), term: String(data.get("term")).trim(), original_grade: String(data.get("grade")).trim(), grading_scale: String(data.get("scale")).trim(), credits: String(data.get("credits")).trim() || undefined }, { onError: setError });
  }
  if (rows.isLoading) return <LoadingBlock label="Loading academic records…"/>;
  if (rows.isError) return <ErrorBlock message={formatError(rows.error)} retry={() => void rows.refetch()}/>;
  return <div><PageHeader eyebrow="Academic profile" title="Academic records" description="Keep original grades and their stated scale intact. Records are submitted as self-reported data; the current API does not support later edits." action={<Button onClick={() => { setError(undefined); setOpen(true); }}><Plus size={16}/> Add record</Button>}/><Panel>{rows.data?.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Subject</th><th>Term</th><th>Grade</th><th>Credits</th><th>Status</th></tr></thead><tbody>{rows.data.map(item => <tr key={item.id}><td data-label="Subject"><strong>{item.subject}</strong></td><td data-label="Term">{item.term}</td><td data-label="Grade">{item.original_grade}<span className="muted">{item.grading_scale}</span></td><td data-label="Credits">{item.credits ?? "—"}</td><td data-label="Status"><Status>{item.status.replaceAll("_", " ")}</Status></td></tr>)}</tbody></table></div> : <EmptyBlock title="No academic records" description="Add a record when you want it reflected in your profile." action={<Button onClick={() => { setError(undefined); setOpen(true); }}>Add record</Button>}/>}</Panel>{open && <Dialog title="Add academic record" onClose={close} dismissible={!add.isPending}><form onSubmit={submit}><h2>Add academic record</h2><p>Use the original grade and grading scale exactly as issued.</p><div className="form-grid modal-fields"><Field label="Subject" error={fieldError(error, "subject")}><input name="subject" maxLength={200} required/></Field><Field label="Term" error={fieldError(error, "term")}><input name="term" maxLength={100} required/></Field><Field label="Original grade" error={fieldError(error, "original_grade")}><input name="grade" maxLength={100} required/></Field><Field label="Grading scale" error={fieldError(error, "grading_scale")}><input name="scale" maxLength={100} required/></Field><Field label="Credits" hint="Optional" error={fieldError(error, "credits")}><input name="credits" maxLength={50}/></Field></div>{error && <p className="form-error">{formatError(error)}</p>}<div className="form-actions"><Button variant="secondary" onClick={close} disabled={add.isPending}>Cancel</Button><Button type="submit" disabled={add.isPending}>{add.isPending ? "Saving…" : "Add record"}</Button></div></form></Dialog>}</div>;
}
