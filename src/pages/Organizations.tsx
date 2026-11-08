import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Save } from "lucide-react";
import { type FormEvent, useState } from "react";
import { arbor, type User } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { Button, Dialog, EmptyBlock, ErrorBlock, Field, fieldError, formatError, LoadingBlock, PageHeader, Panel, Status } from "@/components/app-ui";
import { activeRecruiterSearchOrgIds, recruiterSharingWarning } from "@/features/evidence";

function ProfilePreferencesForm({
  user,
  isPending,
  onSave,
  error,
  success,
}: {
  user?: User;
  isPending: boolean;
  onSave: (body: { display_name: string | null; profile_public: boolean; recruiter_searchable: boolean }) => void;
  error?: Error;
  success: string;
}) {
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [profilePublic, setProfilePublic] = useState(Boolean(user?.profile_public));
  const [recruiterSearchable, setRecruiterSearchable] = useState(Boolean(user?.recruiter_searchable));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      display_name: displayName.trim() || null,
      profile_public: profilePublic,
      recruiter_searchable: recruiterSearchable,
    });
  }

  return (
    <form className="settings-form" onSubmit={submit}>
      <Field label="Display name" error={fieldError(error, "display_name")}>
        <input
          name="displayName"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          maxLength={200}
        />
      </Field>
      <label className="check-row">
        <input
          type="checkbox"
          name="profilePublic"
          checked={profilePublic}
          onChange={e => setProfilePublic(e.target.checked)}
        />
        <span>
          <strong>Public profile visibility</strong>
          <small>
            Controls public profile visibility. This only affects profile viewing and does not
            grant recruiter search consent.
          </small>
        </span>
      </label>
      {fieldError(error, "profile_public") && (
        <small className="field-error">{fieldError(error, "profile_public")}</small>
      )}
      <label className="check-row">
        <input
          type="checkbox"
          name="recruiterSearchable"
          checked={recruiterSearchable}
          onChange={e => setRecruiterSearchable(e.target.checked)}
        />
        <span>
          <strong>Allow recruiter search</strong>
          <small>
            Allows approved recruiters to find your profile. Turning this off stops your account
            from being eligible for recruiter search (subject to server-side share grant rules).
          </small>
        </span>
      </label>
      {fieldError(error, "recruiter_searchable") && (
        <small className="field-error">{fieldError(error, "recruiter_searchable")}</small>
      )}
      {success && !isPending && <p className="notice">{success}</p>}
      {error && <p className="form-error">{formatError(error)}</p>}
      <Button type="submit" disabled={isPending}>
        <Save size={16} />
        {isPending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}

function RecruiterSharingPanel() {
  const { token, user } = useSession();
  const client = useQueryClient();
  const [error, setError] = useState<Error>();

  const approved = useQuery({ queryKey: ["approved-organizations"], queryFn: () => arbor.approvedOrganizations(token!), enabled: Boolean(token) });
  const grants = useQuery({ queryKey: ["share-grants", token], queryFn: () => arbor.shareGrants(token!), enabled: Boolean(token) });

  const toggle = useMutation({
    mutationFn: (body: { organization_id: string; scope: "recruiter_search"; active: boolean }) => arbor.setShareGrant(token!, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["share-grants", token] });
      void client.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  const searchable = useMutation({
    mutationFn: (recruiter_searchable: boolean) => arbor.updateMe(token!, { recruiter_searchable }),
    onSuccess: updatedUser => {
      client.setQueryData(["me", token], updatedUser);
      setError(undefined);
    },
  });

  const grantOrgIds = activeRecruiterSearchOrgIds(grants.data ?? []);
  // A school can never match a recruiter search, so only companies are offered.
  const companies = (approved.data ?? []).filter(org => org.kind === "company");
  const recruiterSearchable = Boolean(user?.recruiter_searchable);
  const warning = recruiterSharingWarning(recruiterSearchable, grantOrgIds);

  return (
    <Panel>
      <h2 className="section-title">Recruiter search sharing</h2>
      <p className="section-copy">
        Approved companies you allow here can find your profile in recruiter search. Nothing is
        shared until you allow it, and turning a company off removes its access.
      </p>
      {warning === "no_grant" && (
        <p className="form-error">
          Recruiter search is on, but no company can see your profile yet. Allow at least one
          company below.
        </p>
      )}
      {warning === "not_searchable" && (
        <p className="notice">
          You allow companies to search for you, but recruiter search is currently off, so your
          profile stays hidden. Turn recruiter search on above.
        </p>
      )}
      <label className="check-row">
        <input
          type="checkbox"
          checked={recruiterSearchable}
          disabled={searchable.isPending}
          onChange={event => {
            setError(undefined);
            searchable.mutate(event.target.checked, { onError: setError });
          }}
        />
        <span>
          <strong>Recruiter search is {recruiterSearchable ? "on" : "off"}</strong>
          <small>This must be on for any company below to find you.</small>
        </span>
      </label>
      {error && <p className="form-error">{formatError(error)}</p>}
      {approved.isLoading && <LoadingBlock label="Loading approved companies…" />}
      {approved.isError && <ErrorBlock message={formatError(approved.error)} retry={() => void approved.refetch()} />}
      {approved.data && grants.data && (
        companies.length === 0 ? (
          <EmptyBlock
            title="No approved company"
            description="Recruiter search needs an approved company organization, not a school. Once an operator approves a company it appears here."
          />
        ) : (
          <div className="organization-list">
            {companies.map(org => {
              const allowed = grantOrgIds.has(org.id);
              return (
                <div className="org-row" key={org.id}>
                  <Building2 size={19} />
                  <div>
                    <strong>{org.name}</strong>
                    <span>
                      {org.kind} · {allowed ? "can find you in recruiter search" : "cannot find you"}
                    </span>
                  </div>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={allowed}
                      disabled={toggle.isPending}
                      onChange={event => {
                        setError(undefined);
                        toggle.mutate(
                          { organization_id: org.id, scope: "recruiter_search", active: event.target.checked },
                          { onError: setError },
                        );
                      }}
                    />
                    <span>Allow recruiter search</span>
                  </label>
                </div>
              );
            })}
          </div>
        )
      )}
    </Panel>
  );
}

export default function Organizations() {
  const { token, user } = useSession();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState<Error>();
  const [organizationError, setOrganizationError] = useState<Error>();

  const rows = useQuery({ queryKey: ["organizations"], queryFn: () => arbor.organizations(token!) });
  const profile = useMutation({
    mutationFn: (body: { display_name?: string | null; profile_public: boolean; recruiter_searchable: boolean }) =>
      arbor.updateMe(token!, body),
    onSuccess: updatedUser => {
      client.setQueryData(["me", token], updatedUser);
      void client.invalidateQueries({ queryKey: ["candidates-search"] });
      void client.invalidateQueries({ queryKey: ["candidates"] });
      setProfileSuccess("Profile preferences saved.");
    },
  });

  const close = () => {
    setOpen(false);
    setOrganizationError(undefined);
  };

  const create = useMutation({
    mutationFn: (body: { name: string; kind: string }) => arbor.createOrganization(token!, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["organizations"] });
      close();
    },
  });

  function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setOrganizationError(undefined);
    create.mutate(
      { name: String(form.get("name")).trim(), kind: String(form.get("kind")).trim() },
      { onError: setOrganizationError },
    );
  }

  if (rows.isLoading) return <LoadingBlock label="Loading organizations…" />;
  if (rows.isError) return <ErrorBlock message={formatError(rows.error)} retry={() => void rows.refetch()} />;

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Identity and access"
        title="Profile and organizations"
        description="Your profile preferences control discovery. Organization roles and approval are assigned by the backend workflow; this app displays them without implying membership administration."
        action={
          <Button
            onClick={() => {
              setOrganizationError(undefined);
              setOpen(true);
            }}
          >
            <Plus size={16} /> Create organization
          </Button>
        }
      />
      <div className="dashboard-grid">
        <Panel>
          <h2 className="section-title">Profile preferences</h2>
          <ProfilePreferencesForm
            key={`${user?.id ?? "anon"}-${user?.display_name ?? ""}-${user?.profile_public ? "1" : "0"}-${user?.recruiter_searchable ? "1" : "0"}`}
            user={user}
            isPending={profile.isPending}
            error={profileError}
            success={profileSuccess}
            onSave={body => {
              setProfileSuccess("");
              setProfileError(undefined);
              profile.mutate(body, { onError: setProfileError });
            }}
          />
        </Panel>
        <Panel>
          <h2 className="section-title">My organizations</h2>
          <p className="section-copy">New organizations start unapproved with your role set to member.</p>
          {rows.data?.length ? (
            <div className="organization-list">
              {rows.data.map(item => (
                <div className="org-row" key={item.id}>
                  <Building2 size={19} />
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.kind} · {item.role}
                    </span>
                  </div>
                  <Status tone={item.approved ? "success" : "warning"}>
                    {item.approved ? "approved" : "pending approval"}
                  </Status>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock title="No organizations" description="Create an organization to begin its approval workflow." />
          )}
        </Panel>
      </div>
      <RecruiterSharingPanel />
      {open && (
        <Dialog title="Create organization" onClose={close} dismissible={!create.isPending}>
          <form onSubmit={submitOrganization}>
            <h2>Create organization</h2>
            <p>Choose the organization kind used by your deployment. Approval and role changes happen outside this API.</p>
            <div className="stack modal-fields">
              <Field label="Organization name" error={fieldError(organizationError, "name")}>
                <input name="name" minLength={1} maxLength={250} required />
              </Field>
              <Field label="Kind" error={fieldError(organizationError, "kind")}>
                <input name="kind" required placeholder="e.g. school or company" />
              </Field>
            </div>
            {organizationError && <p className="form-error">{formatError(organizationError)}</p>}
            <div className="form-actions">
              <Button variant="secondary" onClick={close} disabled={create.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create organization"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
