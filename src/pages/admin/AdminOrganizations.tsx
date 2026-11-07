import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { arbor, type AdminMemberRole, type AdminOrganization, type AdminRole } from "@/api/arbor";
import { useSession } from "@/auth/session";
import {
  Button,
  Dialog,
  EmptyBlock,
  ErrorBlock,
  Field,
  formatError,
  LoadingBlock,
  PageHeader,
  Panel,
  Status,
} from "@/components/app-ui";

const ROLES: AdminRole[] = ["member", "recruiter", "reviewer", "admin"];

/**
 * Options for one member's role select. A legacy `platform_admin` row is shown so
 * the current value is not silently displayed as something else, but the role is
 * not offered for new assignments: it never granted platform access, and the
 * backend rejects it. Moving such a row to any other role is allowed.
 */
function roleOptions(current: AdminMemberRole): AdminMemberRole[] {
  return current === "platform_admin" ? [...ROLES, "platform_admin"] : ROLES;
}
const PAGE_SIZE = 20;

export default function AdminOrganizations() {
  const { token } = useSession();
  const client = useQueryClient();
  const [state, setState] = useState<"all" | "pending" | "approved">("pending");
  const [page, setPage] = useState(1);
  const [openOrg, setOpenOrg] = useState<AdminOrganization | null>(null);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<AdminRole>("member");
  const [actionError, setActionError] = useState<Error>();
  // Revoking approval stops the organization from making *new* review decisions;
  // verdicts already recorded stay valid. That consequence is still significant,
  // so that direction asks first while approving does not.
  const [confirmRevoke, setConfirmRevoke] = useState<AdminOrganization | null>(null);

  const organizations = useQuery({
    queryKey: ["admin-organizations", state, page],
    queryFn: () =>
      arbor.adminOrganizations(token!, {
        approved: state === "all" ? undefined : state === "approved",
        page,
        page_size: PAGE_SIZE,
      }),
  });

  const detail = useQuery({
    queryKey: ["admin-organization", openOrg?.id],
    queryFn: () => arbor.adminOrganization(token!, openOrg!.id),
    enabled: Boolean(openOrg),
  });

  const users = useQuery({
    queryKey: ["admin-users", "picker"],
    queryFn: () => arbor.adminUsers(token!, { page_size: 100 }),
    enabled: Boolean(openOrg),
  });

  const approve = useMutation({
    mutationFn: (body: { id: string; approved: boolean }) =>
      arbor.approveOrganization(token!, body.id, body.approved),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin-organizations"] });
      void client.invalidateQueries({ queryKey: ["admin-organization"] });
      // The learner shell reads its own memberships too.
      void client.invalidateQueries({ queryKey: ["organizations"] });
      void client.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
    onError: setActionError,
  });

  const addMember = useMutation({
    mutationFn: (body: { userId: string; role: AdminRole }) =>
      arbor.addMember(token!, openOrg!.id, { user_id: body.userId, role: body.role }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin-organization"] });
      void client.invalidateQueries({ queryKey: ["admin-organizations"] });
      setUserId("");
      setActionError(undefined);
      // Member counts, the account role chips and the analytics counter all
      // derive from this row.
      void client.invalidateQueries({ queryKey: ["admin-users"] });
      void client.invalidateQueries({ queryKey: ["admin-analytics"] });
      void client.invalidateQueries({ queryKey: ["organizations"] });
    },
    onError: setActionError,
  });

  const changeRole = useMutation({
    mutationFn: (body: { userId: string; role: AdminRole }) =>
      arbor.updateMember(token!, openOrg!.id, body.userId, body.role),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin-organization"] });
      void client.invalidateQueries({ queryKey: ["admin-users"] });
      void client.invalidateQueries({ queryKey: ["admin-user"] });
      // Changing your own membership changes your capabilities.
      void client.invalidateQueries({ queryKey: ["organizations"] });
    },
    onError: setActionError,
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => arbor.removeMember(token!, openOrg!.id, userId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin-organization"] });
      void client.invalidateQueries({ queryKey: ["admin-organizations"] });
      void client.invalidateQueries({ queryKey: ["admin-users"] });
      void client.invalidateQueries({ queryKey: ["admin-user"] });
      void client.invalidateQueries({ queryKey: ["admin-analytics"] });
      void client.invalidateQueries({ queryKey: ["organizations"] });
    },
    onError: setActionError,
  });

  if (organizations.isLoading) return <LoadingBlock label="Loading organizations…" />;
  if (organizations.isError) {
    return (
      <ErrorBlock message={formatError(organizations.error)} retry={() => void organizations.refetch()} />
    );
  }

  const data = organizations.data;
  const lastPage = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  // Only non-members belong in the "add" picker: offering an existing member
  // produces a 409 the administrator cannot act on.
  const existing = new Set(detail.data?.members.map(member => member.user_id) ?? []);
  const candidates = (users.data?.items ?? []).filter(user => !existing.has(user.id));

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Platform administration"
        title="Organizations"
        description="Approval decides whether an organization's reviewers can verify evidence and whether its recruiters can search candidates. Roles are managed per organization."
      />

      <Panel className="admin-toolbar">
        <div className="admin-tabs" role="group" aria-label="Approval filter">
          {(["pending", "approved", "all"] as const).map(option => (
            <button
              key={option}
              type="button"
              aria-pressed={state === option}
              className={state === option ? "admin-tab active" : "admin-tab"}
              onClick={() => {
                setState(option);
                setPage(1);
              }}
            >
              {option === "all" ? "All" : option}
            </button>
          ))}
        </div>
        <div className="admin-toolbar-meta">
          <Status tone="neutral">{data?.total ?? 0} {data?.total === 1 ? "organization" : "organizations"}</Status>
        </div>
      </Panel>

      <Panel>
        {!data?.items.length ? (
          <EmptyBlock
            title={state === "pending" ? "Nothing is waiting for approval" : "No organizations here"}
            description="Organizations are created by their first member through the workspace; this list only approves and staffs them."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th scope="col">Organization</th>
                  <th scope="col">Kind</th>
                  <th scope="col">Members</th>
                  <th scope="col">Approval</th>
                  <th scope="col">
                    <span className="admin-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(org => (
                  <tr key={org.id}>
                    <td data-label="Organization">
                      <span className="admin-tree-name">
                        <Building2 size={14} aria-hidden />
                        <strong>{org.name}</strong>
                      </span>
                    </td>
                    <td data-label="Kind">
                      <span className="muted">{org.kind}</span>
                    </td>
                    <td data-label="Members">{org.member_count}</td>
                    <td data-label="Approval">
                      <Status tone={org.approved ? "success" : "warning"}>
                        {org.approved ? "approved" : "pending"}
                      </Status>
                    </td>
                    <td data-label="Actions">
                      <span className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-link-button"
                          onClick={() => {
                            setActionError(undefined);
                            setOpenOrg(org);
                          }}
                        >
                          Manage
                        </button>
                        <button
                          type="button"
                          className="admin-link-button"
                          disabled={approve.isPending}
                          onClick={() => {
                            if (org.approved) { setConfirmRevoke(org); return; }
                            setActionError(undefined);
                            approve.mutate({ id: org.id, approved: true });
                          }}
                        >
                          {org.approved ? "Revoke" : "Approve"}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {lastPage > 1 && (
          <div className="pager">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={page >= lastPage}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Panel>

      {actionError && <p className="form-error">{formatError(actionError)}</p>}

      {confirmRevoke && (
        <Dialog title="Revoke organization approval?" onClose={() => setConfirmRevoke(null)}>
          <h2>Revoke approval for {confirmRevoke.name}?</h2>
          <p>
            Its reviewers immediately lose the ability to verify evidence, and its recruiters lose
            candidate search. Existing verification records are kept.
          </p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setConfirmRevoke(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={approve.isPending}
              onClick={() => {
                approve.mutate({ id: confirmRevoke.id, approved: false });
                setConfirmRevoke(null);
              }}
            >
              Revoke approval
            </Button>
          </div>
        </Dialog>
      )}

      {openOrg && (
        <Panel className="admin-inline-editor">
          <div className="admin-card-head">
            <Building2 size={18} />
            <h2 className="admin-form-title">Members of {openOrg.name}</h2>
            <button
              type="button"
              className="admin-link-button"
              style={{ marginLeft: "auto" }}
              onClick={() => setOpenOrg(null)}
            >
              Close
            </button>
          </div>
          {detail.isLoading ? (
            <LoadingBlock label="Loading members…" />
          ) : detail.isError ? (
            <ErrorBlock message="Members could not be loaded." retry={() => void detail.refetch()} />
          ) : (
            <div className="table-wrap">
              <table className="data-table admin-table">
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col">Role</th>
                    <th scope="col">
                      <span className="admin-sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detail.data?.members.length ? (
                    detail.data.members.map(member => (
                      <tr key={member.user_id}>
                        <td data-label="Member">
                          <strong>{member.display_name ?? "Unnamed"}</strong>
                          <span className="muted">{member.email ?? member.user_id}</span>
                        </td>
                        <td data-label="Role">
                          <select
                            aria-label={`Role for ${member.email ?? member.user_id}`}
                            value={member.role}
                            onChange={event =>
                              changeRole.mutate({
                                userId: member.user_id,
                                role: event.target.value as AdminRole,
                              })
                            }
                          >
                            {roleOptions(member.role).map(option => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td data-label="Remove">
                          <button
                            type="button"
                            className="admin-link-button admin-link-danger"
                            aria-label={`Remove ${member.email ?? member.user_id}`}
                            disabled={removeMember.isPending}
                            onClick={() => removeMember.mutate(member.user_id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>
                        <span className="muted">No members yet.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <form
            className="admin-inline-row"
            onSubmit={event => {
              event.preventDefault();
              setActionError(undefined);
              addMember.mutate({ userId, role });
            }}
          >
            <Field label="Add account">
              <select
                aria-label="Add account"
                value={userId}
                onChange={event => setUserId(event.target.value)}
                required
              >
                <option value="">Select an account</option>
                {candidates.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.display_name ?? user.email ?? user.id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Role">
              <select
                aria-label="Role"
                value={role}
                onChange={event => setRole(event.target.value as AdminRole)}
              >
                {ROLES.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" disabled={!userId || addMember.isPending}>
              <Plus size={15} /> {addMember.isPending ? "Adding…" : "Add member"}
            </Button>
          </form>
        </Panel>
      )}
    </div>
  );
}
