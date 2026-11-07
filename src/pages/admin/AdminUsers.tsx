import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { arbor, type AdminPage, type AdminUser } from "@/api/arbor";
import { useSession } from "@/auth/session";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  Panel,
  Status,
} from "@/components/app-ui";
import { formatDate } from "@/lib/display";

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const { token } = useSession();
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [profilePublic, setProfilePublic] = useState(false);
  const [searchable, setSearchable] = useState(false);
  const deferred = useDeferredValue(query);

  const users = useQuery({
    queryKey: ["admin-users", deferred, page],
    queryFn: () => arbor.adminUsers(token!, { q: deferred || undefined, page, page_size: PAGE_SIZE }),
    placeholderData: (previous: AdminPage<AdminUser> | undefined) => previous,
  });

  // Organization context for the account being edited. `roles` on the list is a
  // flat union across organizations, so it cannot say which organization grants
  // which role — the detail endpoint can.
  const detail = useQuery({
    queryKey: ["admin-user", editing?.id],
    queryFn: () => arbor.adminUser(token!, editing!.id),
    enabled: Boolean(editing),
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
      setEditing(null);
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
                          setEditing(user);
                          setDisplayName(user.display_name ?? "");
                          setProfilePublic(user.profile_public);
                          setSearchable(user.recruiter_searchable);
                        }}
                      >
                        Edit name
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

      {editing && (
        <Panel className="admin-inline-editor">
          <form
            onSubmit={event => {
              event.preventDefault();
              save.mutate({
                id: editing.id,
                display_name: displayName.trim() || null,
                profile_public: profilePublic,
                recruiter_searchable: searchable,
              });
            }}
          >
            <h2 className="admin-form-title">Account settings</h2>
            <p className="admin-note">
              Editing {editing.email ?? "this account"}. Email is owned by the identity provider and
              cannot be changed here. Platform administration is never granted here: it comes from
              the <code>platform_admin</code> token claim, so organization roles shown below do not
              confer it.
            </p>
            <div className="admin-inline-row">
              <label>
                Display name
                <input
                  aria-label="Display name"
                  value={displayName}
                  maxLength={200}
                  onChange={event => setDisplayName(event.target.value)}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={profilePublic}
                  onChange={event => setProfilePublic(event.target.checked)}
                />
                Public profile
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={searchable}
                  onChange={event => setSearchable(event.target.checked)}
                />
                Recruiter searchable
              </label>
            </div>

            <h3 className="admin-form-title">Organization roles</h3>
            {detail.isLoading ? (
              <p className="muted">Loading memberships…</p>
            ) : detail.isError ? (
              <p className="form-error">Memberships could not be loaded.</p>
            ) : detail.data?.memberships.length ? (
              <ul className="admin-memberships">
                {detail.data.memberships.map(membership => (
                  <li key={`${membership.organization_id}-${membership.role}`}>
                    <strong>{membership.organization_name}</strong>
                    <code className="admin-code">{membership.role}</code>
                    <span className="muted">
                      {membership.approved ? "approved" : "pending approval"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Not a member of any organization.</p>
            )}

            <div className="admin-inline-row">
              <button type="submit" className="button button-primary" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            </div>
            {save.isError && <p className="form-error">The change could not be saved.</p>}
          </form>
        </Panel>
      )}
    </div>
  );
}
