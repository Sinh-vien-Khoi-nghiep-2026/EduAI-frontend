import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Save } from "lucide-react";
import { type FormEvent, useState } from "react";
import { arbor } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { Button, Dialog, EmptyBlock, ErrorBlock, Field, fieldError, formatError, LoadingBlock, PageHeader, Panel, Status } from "@/components/app-ui";

export default function Organizations() {
  const { token, user } = useSession();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState<Error>();
  const [organizationError, setOrganizationError] = useState<Error>();
  const rows = useQuery({ queryKey: ["organizations"], queryFn: () => arbor.organizations(token!) });
  const profile = useMutation({
    mutationFn: (body: { display_name?: string; profile_public: boolean; recruiter_searchable: boolean }) => arbor.updateMe(token!, body),
    onSuccess: user => { client.setQueryData(["me", token], user); setProfileSuccess("Profile preferences saved."); },
  });
  const close = () => { setOpen(false); setOrganizationError(undefined); };
  const create = useMutation({ mutationFn: (body: { name: string; kind: string }) => arbor.createOrganization(token!, body), onSuccess: () => { void client.invalidateQueries({ queryKey: ["organizations"] }); close(); } });
  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setProfileSuccess("");
    setProfileError(undefined);
    profile.mutate({ display_name: String(form.get("displayName")).trim() || undefined, profile_public: form.get("profilePublic") === "on", recruiter_searchable: form.get("recruiterSearchable") === "on" }, { onError: setProfileError });
  }
  function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setOrganizationError(undefined);
    create.mutate({ name: String(form.get("name")).trim(), kind: String(form.get("kind")).trim() }, { onError: setOrganizationError });
  }
  if (rows.isLoading) return <LoadingBlock label="Loading organizations…"/>;
  if (rows.isError) return <ErrorBlock message={formatError(rows.error)} retry={() => void rows.refetch()}/>;
  return <div className="stack"><PageHeader eyebrow="Identity and access" title="Profile and organizations" description="Your profile preferences control discovery. Organization roles and approval are assigned by the backend workflow; this app displays them without implying membership administration." action={<Button onClick={() => { setOrganizationError(undefined); setOpen(true); }}><Plus size={16}/> Create organization</Button>}/><div className="dashboard-grid"><Panel><h2 className="section-title">Profile preferences</h2><form className="settings-form" onSubmit={submitProfile}><Field label="Display name" error={fieldError(profileError, "display_name")}><input name="displayName" defaultValue={user?.display_name ?? ""} maxLength={200}/></Field><label className="check-row"><input type="checkbox" name="profilePublic" defaultChecked={user?.profile_public}/><span><strong>Make profile public</strong><small>Stores `profile_public` on your backend profile.</small></span></label><label className="check-row"><input type="checkbox" name="recruiterSearchable" defaultChecked={user?.recruiter_searchable}/><span><strong>Allow recruiter search</strong><small>Search still requires active organization-scoped sharing and recruiter eligibility.</small></span></label>{profileSuccess && <p className="notice">{profileSuccess}</p>}{profileError && <p className="form-error">{formatError(profileError)}</p>}<Button type="submit" disabled={profile.isPending}><Save size={16}/>{profile.isPending ? "Saving…" : "Save preferences"}</Button></form></Panel><Panel><h2 className="section-title">My organizations</h2><p className="section-copy">New organizations start unapproved with your role set to member.</p>{rows.data?.length ? <div className="organization-list">{rows.data.map(item => <div className="org-row" key={item.id}><Building2 size={19}/><div><strong>{item.name}</strong><span>{item.kind} · {item.role}</span></div><Status tone={item.approved ? "success" : "warning"}>{item.approved ? "approved" : "pending approval"}</Status></div>)}</div> : <EmptyBlock title="No organizations" description="Create an organization to begin its approval workflow."/>}</Panel></div>{open && <Dialog title="Create organization" onClose={close}><form onSubmit={submitOrganization}><h2>Create organization</h2><p>Choose the organization kind used by your deployment. Approval and role changes happen outside this API.</p><div className="stack modal-fields"><Field label="Organization name" error={fieldError(organizationError, "name")}><input name="name" minLength={1} maxLength={250} required/></Field><Field label="Kind" error={fieldError(organizationError, "kind")}><input name="kind" required placeholder="e.g. school or company"/></Field></div>{organizationError && <p className="form-error">{formatError(organizationError)}</p>}<div className="form-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create organization"}</Button></div></form></Dialog>}</div>;
}
