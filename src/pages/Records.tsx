import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { arbor } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { Button, EmptyBlock, ErrorBlock, Field, formatError, LoadingBlock, PageHeader, Panel, Status } from "@/components/app-ui";

export default function Records() {
  const { token } = useSession();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const rows = useQuery({ queryKey: ["academics"], queryFn: () => arbor.academics(token!) });
  const add = useMutation({
    mutationFn: (body: { subject: string; term: string; original_grade: string; grading_scale: string; credits?: string }) => arbor.createAcademic(token!, body),
    onSuccess: () => { void client.invalidateQueries({ queryKey: ["academics"] }); setOpen(false); },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    add.mutate({ subject: String(data.get("subject")), term: String(data.get("term")), original_grade: String(data.get("grade")), grading_scale: String(data.get("scale")), credits: String(data.get("credits")) || undefined }, { onError: cause => setError(formatError(cause)) });
  }
  if (rows.isLoading) return <LoadingBlock label="Loading academic records…"/>;
  if (rows.isError) return <ErrorBlock message={formatError(rows.error)} retry={() => void rows.refetch()}/>;
  return <div><PageHeader eyebrow="Academic profile" title="Academic records" description="Keep original grades and their stated scale intact. Records are submitted as self-reported data; the current API does not support later edits." action={<Button onClick={() => setOpen(true)}><Plus size={16}/> Add record</Button>}/><Panel>{rows.data?.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Subject</th><th>Term</th><th>Grade</th><th>Credits</th><th>Status</th></tr></thead><tbody>{rows.data.map(item => <tr key={item.id}><td data-label="Subject"><strong>{item.subject}</strong></td><td data-label="Term">{item.term}</td><td data-label="Grade">{item.original_grade}<span className="muted">{item.grading_scale}</span></td><td data-label="Credits">{item.credits ?? "—"}</td><td data-label="Status"><Status>{item.status.replaceAll("_", " ")}</Status></td></tr>)}</tbody></table></div> : <EmptyBlock title="No academic records" description="Add a record when you want it reflected in your profile." action={<Button onClick={() => setOpen(true)}>Add record</Button>}/>}</Panel>{open && <div className="modal-backdrop"><form className="modal" onSubmit={submit}><h2>Add academic record</h2><p>Use the original grade and grading scale exactly as issued.</p><div className="form-grid modal-fields"><Field label="Subject"><input name="subject" maxLength={200} required/></Field><Field label="Term"><input name="term" maxLength={100} required/></Field><Field label="Original grade"><input name="grade" maxLength={100} required/></Field><Field label="Grading scale"><input name="scale" maxLength={100} required/></Field><Field label="Credits" hint="Optional"><input name="credits" maxLength={50}/></Field></div>{error && <p className="form-error">{error}</p>}<div className="form-actions"><Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={add.isPending}>{add.isPending ? "Saving…" : "Add record"}</Button></div></form></div>}</div>;
}
