import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { arbor, type Achievement } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { Button, Dialog, EmptyBlock, ErrorBlock, Field, fieldError, formatError, LoadingBlock, PageHeader, Panel, Status } from "@/components/app-ui";
import { safeExternalUrl } from "@/lib/display";

type Mode = "project" | "achievement" | "edit-achievement" | null;
type Saved = { id: string; status?: string; title?: string; revision?: number; name?: string; visibility?: string };

export default function Portfolio() {
  const { token } = useSession();
  const client = useQueryClient();
  const [mode, setMode] = useState<Mode>(null);
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [error, setError] = useState<Error>();
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => arbor.projects(token!) });
  const achievements = useQuery({ queryKey: ["achievements"], queryFn: () => arbor.achievements(token!) });
  const close = () => { setMode(null); setEditing(null); setError(undefined); };
  const save = useMutation<Saved, Error, { mode: Exclude<Mode, null>; data: FormData }>({
    mutationFn: async input => {
      const url = String(input.data.get("url")).trim() || undefined;
      if (input.mode === "project") return arbor.createProject(token!, { name: String(input.data.get("name")).trim(), url, visibility: String(input.data.get("visibility")).trim() || undefined, data: {} });
      const body = { title: String(input.data.get("name")).trim(), kind: String(input.data.get("kind")).trim(), url, data: {} };
      return input.mode === "edit-achievement" && editing ? arbor.updateAchievement(token!, editing.id, body) : arbor.createAchievement(token!, body);
    },
    onSuccess: () => { void client.invalidateQueries({ queryKey: ["projects"] }); void client.invalidateQueries({ queryKey: ["achievements"] }); close(); },
  });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!mode) return; setError(undefined); save.mutate({ mode, data: new FormData(event.currentTarget) }, { onError: setError }); }
  if (projects.isLoading || achievements.isLoading) return <LoadingBlock label="Loading portfolio…"/>;
  if (projects.isError || achievements.isError) return <ErrorBlock message="Your portfolio could not be loaded." retry={() => void Promise.all([projects.refetch(), achievements.refetch()])}/>;
  const heading = mode === "project" ? "Add project" : mode === "edit-achievement" ? "Edit achievement" : "Add achievement";
  return <div className="stack"><PageHeader eyebrow="Portfolio" title="Projects and achievements" description="Capture work and achievements you want associated with your professional profile. Project and achievement APIs are intentionally separate." action={<div className="action-pair"><Button variant="secondary" onClick={() => { setError(undefined); setMode("achievement"); }}><Plus size={16}/> Achievement</Button><Button onClick={() => { setError(undefined); setMode("project"); }}><Plus size={16}/> Project</Button></div>}/><div className="dashboard-grid"><Panel><h2 className="section-title">Projects</h2><p className="section-copy">Projects can be created and listed. The current backend does not support project edits or deletion.</p>{projects.data?.length ? <div className="portfolio-list">{projects.data.map(item => { const url = safeExternalUrl(item.url); return <div className="portfolio-row" key={item.id}><div><strong>{item.name}</strong><span>{item.source} · {item.visibility}</span></div>{url && <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.name}`}><ExternalLink size={16}/></a>}</div>; })}</div> : <EmptyBlock title="No projects yet" description="Add a project URL or a concise manual entry."/>}</Panel><Panel><h2 className="section-title">Achievements</h2><p className="section-copy">Achievements can be edited; editing returns their status to self-reported.</p>{achievements.data?.length ? <div className="portfolio-list">{achievements.data.map(item => { const url = safeExternalUrl(item.url); return <div className="portfolio-row" key={item.id}><div><strong>{item.title}</strong><span>{item.kind} · <Status>{item.status.replaceAll("_", " ")}</Status></span></div><div className="row-actions">{url && <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.title}`}><ExternalLink size={16}/></a>}<Button variant="quiet" aria-label={`Edit ${item.title}`} onClick={() => { setError(undefined); setEditing(item); setMode("edit-achievement"); }}><Pencil size={16}/></Button></div></div>; })}</div> : <EmptyBlock title="No achievements yet" description="Add awards, credentials, or other achievements you want to keep."/>}</Panel></div>{mode && <Dialog title={heading} onClose={close}><form onSubmit={submit}><h2>{heading}</h2><p>{mode === "project" ? "Project visibility is backend-defined. Enter the exact value your workflow requires, or leave it blank for the backend default." : "Provide a clear title and kind. Optional links must be valid absolute URLs."}</p><div className="stack modal-fields"><Field label={mode === "project" ? "Project name" : "Title"} error={fieldError(error, mode === "project" ? "name" : "title")}><input name="name" minLength={1} maxLength={300} required defaultValue={editing?.title}/></Field>{mode !== "project" && <Field label="Kind" error={fieldError(error, "kind")}><input name="kind" minLength={1} maxLength={40} required defaultValue={editing?.kind}/></Field>}<Field label="URL" hint="Optional" error={fieldError(error, "url")}><input name="url" type="url" defaultValue={editing?.url ?? ""} placeholder="https://…"/></Field>{mode === "project" && <Field label="Visibility" hint="Optional — backend default is private" error={fieldError(error, "visibility")}><input name="visibility" defaultValue="private"/></Field>}</div>{error && <p className="form-error">{formatError(error)}</p>}<div className="form-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button></div></form></Dialog>}</div>;
}
