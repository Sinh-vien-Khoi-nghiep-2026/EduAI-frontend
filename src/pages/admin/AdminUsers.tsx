import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { arbor, type AdminPage, type AdminUser, type AdminUserDetail } from "@/api/arbor";
import { useSession } from "@/auth/session";
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
import { formatDate } from "@/lib/display";

const PAGE_SIZE = 20;

function AdminAccountModalForm({
  user,
  isPending,
  error,
  onCancel,
  onSave,
}: {
  user: AdminUserDetail;
  isPending: boolean;
  error: unknown;
  onCancel: () => void;
  onSave: (body: {
    display_name: string | null;
    profile_public: boolean;
    recruiter_searchable: boolean;
  }) => void;
}) {
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [profilePublic, setProfilePublic] = useState(user.profile_public);
  const [searchable, setSearchable] = useState(user.recruiter_searchable);

  const nameError = fieldError(error, "display_name");
  const profilePublicError = fieldError(error, "profile_public");
  const searchableError = fieldError(error, "recruiter_searchable");
  const generalError = error ? formatError(error) : null;

  return (
    <form
      className="stack modal-fields"
      onSubmit={event => {
        event.preventDefault();
        onSave({
          display_name: displayName.trim() || null,
          profile_public: profilePublic,
          recruiter_searchable: searchable,
        });
      }}
    >
      <h2>Edit account</h2>
      <p className="admin-note">
        Editing {user.email ?? "this account"}. Email is owned by the identity provider and
        cannot be changed here. Platform administration is never granted here: it comes from
        the <code>platform_admin</code> token claim.
      </p>

      <Field label="Account email">
        <input value={user.email ?? "no email"} readOnly disabled />
      </Field>

      <Field label="Display name" error={nameError}>
        <input
          aria-label="Display name"
          value={displayName}
          maxLength={200}
          onChange={event => setDisplayName(event.target.value)}
        />
      </Field>

      <label className="check-row">
        <input
          type="checkbox"
          checked={profilePublic}
          onChange={event => setProfilePublic(event.target.checked)}
        />
        <span>
          <strong>Public profile</strong>
          <small>
            Controls whether the student profile is visible publicly. Profile visibility is
            separate from recruiter search consent and does not make the account recruiter-searchable.
          </small>
        </span>
      </label>
      {profilePublicError && <small className="field-error">{profilePublicError}</small>}

      <label className="check-row">
        <input
          type="checkbox"
          checked={searchable}
          onChange={event => setSearchable(event.target.checked)}
        />
        <span>
          <strong>Recruiter searchable (administrative override)</strong>
          <small>
            The recruiter searchable flag is the student's own consent signal. Toggling this flag
            here is an administrative override of the student's stated preference, not proof of
            student consent, and should be exceptional.
          </small>
        </span>
      </label>
      {searchableError && <small className="field-error">{searchableError}</small>}

      <div className="admin-memberships-section">
        <strong>Organization roles</strong>
        {user.memberships.length ? (
          <ul className="admin-memberships-list">
            {user.memberships.map(membership => (
              <li key={`${membership.organization_id}-${membership.role}`}>
                {membership.organization_name} — {membership.role} —{" "}
                {membership.approved ? "approved" : "pending"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Not a member of any organization.</p>
        )}
      </div>

      {generalError && <p className="form-error">{generalError}</p>}

      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export default function AdminUsers() {
  const { token, user: sessionUser } = useSession();
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const deferred = useDeferredValue(query);

  const users = useQuery({
    queryKey: ["admin-users", deferred, page],
    queryFn: () => arbor.adminUsers(token!, { q: deferred || undefined, page, page_size: PAGE_SIZE }),
    placeholderData: (previous: AdminPage<AdminUser> | undefined) => previous,
  });

  const detail = useQuery({
    queryKey: ["admin-user", editingUserId],
    queryFn: () => arbor.adminUser(token!, editingUserId!),
    enabled: Boolean(editingUserId),
  });

  const save = useMutation({
    mutationFn: (body: {
      id: string;
      display_name: string | null;
      profile_public: boolean;
      recruiter_searchable: boolean;
    }) =>
      arbor.updateAdminUser(token!, body.id, {
        display_name: body.display_name,
        profile_public: body.profile_public,
        recruiter_searchable: body.recruiter_searchable,
      }),
    onSuccess: (_updated, body) => {
      void client.invalidateQueries({ queryKey: ["admin-users"] });
      void client.invalidateQueries({ queryKey: ["admin-user", body.id] });
      if (sessionUser?.id === body.id) {
        void client.invalidateQueries({ queryKey: ["me", token] });
      }
      setEditingUserId(null);
    },
  });

  if (users.isLoading) return <LoadingBlock label="Loading accounts…" />;
  if (users.isError) {
    return <ErrorBlock message="Accounts could not be loaded." retry={() => void users.refetch()} />;
  }

  const data = users.data;
  const lastPage = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Platform administration"
        title="Accounts"
        description="Every account the platform has created from a verified identity. Roles come from organization memberships; search matches display name or email."
      />

      <Panel className="admin-toolbar">
        <label className="admin-search">
          <Search size={16} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search name or email"
            aria-label="Search accounts"
          />
        </label>
        <div className="admin-toolbar-meta">
          <Status tone="neutral">{data?.total ?? 0} accounts</Status>
          <Status tone="neutral">
            page {data?.page ?? 1} / {lastPage}
          </Status>
        </div>
      </Panel>

      <Panel>
        {!data?.items.length ? (
          <EmptyBlock
            title={deferred ? "No account matches that search" : "No accounts yet"}
            description={
              deferred
                ? "Try a different name or email, or clear the search to list every account."
                : "Accounts are created the first time a verified identity calls the API."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th scope="col">Account</th>
                  <th scope="col">Organization roles</th>
                  <th scope="col">Discovery</th>
                  <th scope="col">Created</th>
                  <th scope="col">
                    <span className="admin-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(user => (
                  <tr key={user.id}>
                    <td data-label="Account">
                      <strong>{user.display_name ?? "Unnamed account"}</strong>
                      <span className="muted">{user.email ?? "no email"}</span>
                    </td>
                    <td data-label="Organization roles">
                      {user.roles.length ? (
                        <span className="admin-chips">
                          {user.roles.map(role => (
                            <code className="admin-code" key={role}>
                              {role}
                            </code>
                          ))}
                        </span>
                      ) : (
                        <span className="muted">none</span>
                      )}
                    </td>
                    <td data-label="Discovery">
                      <span className="muted">
                        {user.profile_public ? "public profile" : "private"} ·{" "}
                        {user.recruiter_searchable ? "searchable" : "not searchable"}
                      </span>
                    </td>
                    <td data-label="Created">
                      <span className="muted">{formatDate(user.created_at)}</span>
                    </td>
                    <td data-label="Actions">
                      <button
                        type="button"
                        className="admin-link-button"
                        onClick={() => {
                          save.reset();
                          setEditingUserId(user.id);
                        }}
                      >
                        Edit account
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {lastPage > 1 && (
          <div className="pager">
            <button
              type="button"
              className="button button-secondary"
              disabled={page <= 1}
              onClick={() => setPage(current => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={page >= lastPage}
              onClick={() => setPage(current => Math.min(lastPage, current + 1))}
            >
              Next
            </button>
          </div>
        )}
      </Panel>

      {editingUserId && (
        <Dialog
          title="Edit account"
          onClose={() => {
            setEditingUserId(null);
            save.reset();
          }}
          dismissible={!save.isPending}
        >
          {detail.isLoading ? (
            <LoadingBlock label="Loading account details…" />
          ) : detail.isError ? (
            <div className="stack">
              <p className="form-error">{formatError(detail.error)}</p>
              <div className="form-actions">
                <Button variant="secondary" onClick={() => setEditingUserId(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : detail.data ? (
            <AdminAccountModalForm
              key={detail.data.id}
              user={detail.data}
              isPending={save.isPending}
              error={save.error}
              onCancel={() => {
                setEditingUserId(null);
                save.reset();
              }}
              onSave={body => {
                save.mutate({ id: detail.data.id, ...body });
              }}
            />
          ) : null}
        </Dialog>
      )}
    </div>
  );
}
