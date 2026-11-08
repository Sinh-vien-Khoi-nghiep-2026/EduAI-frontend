import { request } from "./client";

export type User = { id: string; display_name: string | null; email: string | null; profile_public: boolean; recruiter_searchable: boolean };
export type Organization = { id: string; name: string; kind: string; role: "member" | "recruiter" | "reviewer" | "admin" | "platform_admin"; approved: boolean };
export type Skill = { id: string; stable_id: string; name: string; path: string; parent_id: string | null };
export type SkillUpdateInput = { name?: string; path?: string; parent_id?: string | null };
export type SkillProgress = { skill_id: string; stable_id: string; name: string; level: number; status: string };
export type SkillTree = { user_id: string; nodes: SkillProgress[]; edges: { from: string; to: string }[] };
export type AcademicRecord = { id: string; subject: string; term: string; original_grade: string; grading_scale: string; credits: string | null; status: string };
export type Achievement = { id: string; title: string; kind: string; url: string | null; status: string; revision: number };
export type Project = { id: string; name: string; url: string | null; visibility: string; source: string };
export type Notification = { id: string; kind: string; body: Record<string, unknown>; read: boolean; created_at: string };
export type Integration = { provider: string; status: string; capabilities: Record<string, boolean>; unsupported?: string[]; last_sync_at: string | null; error?: string | null };
export type CandidateResult = { items: { id: string; display_name: string | null }[]; page: number; page_size: number };
export type AuthConfig = { issuer: string; discovery_url: string; client_id: string; audience: string; scopes: string[]; pkce: "S256"; grant_type: "authorization_code"; redirect_uri: string };
export type EvidenceInput = { source: string; external_id?: string; url?: string; title: string; data: Record<string, unknown> };
export type EvidencePatchInput = { source?: string; external_id?: string | null; url?: string | null; title?: string; data?: Record<string, unknown> };
export type EvidenceCreated = { id: string; revision: number; status: string };
export type EvidenceReview = { id: string; status: string; evidence_revision: number };
export type StudentEvidence = { id: string; title: string; source: string; status: string; revision: number; url: string | null; external_id: string | null; data: Record<string, unknown> };
export type ShareGrant = { id: string; organization_id: string; organization_name: string; organization_kind: string; organization_approved: boolean; scope: "recruiter_search" | "evidence" | "verification" | "project"; active: boolean };
export type ApprovedOrganization = { id: string; name: string; kind: string };

export type ReviewOrganization = { id: string; name: string; kind: string; role: string };
export type ReviewEvidenceItem = {
  id: string;
  title: string;
  source: string;
  status: string;
  revision: number;
  url: string | null;
  owner_id: string;
};
export type ReviewLearner = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  evidence: ReviewEvidenceItem[];
};
export type ReviewOrganizationDetail = {
  organization: { id: string; name: string };
  learners: ReviewLearner[];
};

export type SkillCreateInput = { stable_id: string; name: string; path?: string; parent_id?: string | null };
export type SkillCreated = { id: string; stable_id: string; name: string };

export type AdminPage<T> = { items: T[]; page: number; page_size: number; total: number };
export type AdminUser = { id: string; display_name: string | null; email: string | null; profile_public: boolean; recruiter_searchable: boolean; created_at: string; roles: string[] };
export type AdminUserDetail = { id: string; display_name: string | null; email: string | null; profile_public: boolean; recruiter_searchable: boolean; created_at: string; memberships: { organization_id: string; organization_name: string; kind: string; approved: boolean; role: AdminMemberRole }[] };
export type AdminOrganization = { id: string; name: string; kind: string; approved: boolean; created_at: string; member_count: number };
export type AdminOrganizationDetail = { id: string; name: string; kind: string; approved: boolean; created_at: string; members: { user_id: string; display_name: string | null; email: string | null; role: AdminMemberRole }[] };
export type AdminEvidence = { id: string; owner_id: string; source: string; title: string; url: string | null; status: string; revision: number; verified_organization_id: string | null };
export type AdminAnalytics = { users: number; organizations: { total: number; approved: number; pending: number }; memberships: number; evidence: { total: number; by_status: Record<string, number> }; /** Historical verified review actions; current verified evidence is evidence.by_status.verified. */ reviews: { total: number; verified: number } };
export type AdminRole = "member" | "recruiter" | "reviewer" | "admin";
/** Legacy membership rows may still hold `platform_admin`; it grants nothing. */
export type AdminMemberRole = AdminRole | "platform_admin";

function query(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const suffix = search.toString();
  return suffix ? `?${suffix}` : "";
}

const auth = (token: string) => ({ token });
export const arbor = {
  authConfig: () => request<AuthConfig>("/auth/config"),
  me: (token: string) => request<User>("/users/me", auth(token)),
  updateMe: (token: string, body: Partial<Omit<User, "id" | "email">>) => request<User>("/users/me", { ...auth(token), method: "PATCH", body }),
  organizations: (token: string) => request<Organization[]>("/organizations/mine", auth(token)),
  approvedOrganizations: (token: string) => request<ApprovedOrganization[]>("/organizations/approved", auth(token)),
  shareGrants: (token: string) => request<ShareGrant[]>("/share-grants/me", auth(token)),
  setShareGrant: (token: string, body: { organization_id: string; scope: ShareGrant["scope"]; active: boolean }) => request<ShareGrant>("/share-grants/me", { ...auth(token), method: "PUT", body }),
  createOrganization: (token: string, body: { name: string; kind: string }) => request<{ id: string; approved: boolean; role: string }>("/organizations", { ...auth(token), method: "POST", body }),
  skills: () => request<Skill[]>("/skills"),
  createSkill: (token: string, body: SkillCreateInput) => request<SkillCreated>("/skills", { ...auth(token), method: "POST", body }),
  updateSkill: (token: string, id: string, body: { name?: string; path?: string; parent_id?: string | null }) => request<Skill>(`/skills/${encodeURIComponent(id)}`, { ...auth(token), method: "PATCH", body }),
  deleteSkill: (token: string, id: string) => request<void>(`/skills/${encodeURIComponent(id)}`, { ...auth(token), method: "DELETE" }),
  mySkills: (token: string) => request<SkillTree>("/skills/me", auth(token)),
  skillTree: (token: string) => request<SkillTree>("/skill-trees/me", auth(token)),
  saveSkill: (token: string, body: { skill_id: string; level: number; evidence_id?: string }) => request<{ skill_id: string; level: number; status: string }>("/skills/me/progress", { ...auth(token), method: "PUT", body }),
  removeSkill: (token: string, stableId: string) => request<void>(`/skills/me/progress/${encodeURIComponent(stableId)}`, { ...auth(token), method: "DELETE" }),
  academics: (token: string) => request<AcademicRecord[]>("/academic-records/me", auth(token)),
  createAcademic: (token: string, body: { subject: string; term: string; original_grade: string; grading_scale: string; credits?: string }) => request<AcademicRecord>("/academic-records/me", { ...auth(token), method: "POST", body }),
  achievements: (token: string) => request<Achievement[]>("/achievements/me", auth(token)),
  createAchievement: (token: string, body: { title: string; kind: string; url?: string; data: Record<string, never> }) => request<Pick<Achievement, "id" | "title" | "status">>("/achievements/me", { ...auth(token), method: "POST", body }),
  updateAchievement: (token: string, id: string, body: { title: string; kind: string; url?: string; data: Record<string, never> }) => request<Pick<Achievement, "id" | "status" | "revision">>(`/achievements/me/${id}`, { ...auth(token), method: "PATCH", body }),
  projects: (token: string) => request<Project[]>("/projects/me", auth(token)),
  createProject: (token: string, body: { name: string; url?: string; visibility?: string; data: Record<string, never> }) => request<Pick<Project, "id" | "name" | "visibility">>("/projects/me", { ...auth(token), method: "POST", body }),
  createEvidence: (token: string, body: EvidenceInput) => request<EvidenceCreated>("/evidence/me", { ...auth(token), method: "POST", body }),
  updateEvidence: (token: string, id: string, body: EvidencePatchInput) => request<EvidenceCreated>(`/evidence/${encodeURIComponent(id)}`, { ...auth(token), method: "PATCH", body }),
  reviewEvidence: (token: string, id: string, body: { organization_id: string; status: "verified" | "rejected" | "revoked"; note?: string }) => request<EvidenceReview>(`/evidence/${encodeURIComponent(id)}/review`, { ...auth(token), method: "POST", body }),
  reviewOrganizations: (token: string) => request<ReviewOrganization[]>("/evidence/review/organizations", auth(token)),
  reviewOrganizationDetail: (token: string, id: string) => request<ReviewOrganizationDetail>(`/evidence/review/organizations/${encodeURIComponent(id)}`, auth(token)),
  myEvidence: (token: string) => request<StudentEvidence[]>("/evidence/me", auth(token)),
  analytics: (token: string) => request<AdminAnalytics>("/admin/analytics", auth(token)),
  adminUsers: (token: string, params: { q?: string; page?: number; page_size?: number } = {}) => request<AdminPage<AdminUser>>(`/admin/users${query(params)}`, auth(token)),
  adminUser: (token: string, id: string) => request<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`, auth(token)),
  updateAdminUser: (token: string, id: string, body: { display_name?: string | null; profile_public?: boolean; recruiter_searchable?: boolean }) => request<{ id: string; display_name: string | null; email: string | null; profile_public: boolean; recruiter_searchable: boolean }>(`/admin/users/${encodeURIComponent(id)}`, { ...auth(token), method: "PATCH", body }),
  adminOrganizations: (token: string, params: { approved?: boolean; kind?: string; page?: number; page_size?: number } = {}) => request<AdminPage<AdminOrganization>>(`/admin/organizations${query(params)}`, auth(token)),
  adminOrganization: (token: string, id: string) => request<AdminOrganizationDetail>(`/admin/organizations/${encodeURIComponent(id)}`, auth(token)),
  approveOrganization: (token: string, id: string, approved: boolean) => request<{ id: string; approved: boolean }>(`/admin/organizations/${encodeURIComponent(id)}`, { ...auth(token), method: "PATCH", body: { approved } }),
  addMember: (token: string, orgId: string, body: { user_id: string; role: AdminRole }) => request<{ organization_id: string; user_id: string; role: string }>(`/admin/organizations/${encodeURIComponent(orgId)}/members`, { ...auth(token), method: "POST", body }),
  updateMember: (token: string, orgId: string, userId: string, role: AdminRole) => request<{ organization_id: string; user_id: string; role: string }>(`/admin/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`, { ...auth(token), method: "PATCH", body: { role } }),
  removeMember: (token: string, orgId: string, userId: string) => request<void>(`/admin/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`, { ...auth(token), method: "DELETE" }),
  adminEvidence: (token: string, params: { status?: string; organization_id?: string; page?: number; page_size?: number } = {}) => request<AdminPage<AdminEvidence>>(`/admin/evidence${query(params)}`, auth(token)),
  notifications: (token: string) => request<Notification[]>("/notifications", auth(token)),
  markNotificationRead: (token: string, id: string) => request<{ read: true }>(`/notifications/${encodeURIComponent(id)}/read`, { ...auth(token), method: "POST" }),
  integrations: (token: string) => request<Integration[]>("/integrations", auth(token)),
  candidateSearch: (token: string, body: { organization_id: string; match: "all" | "any"; skills: { skill_id: string; min_level: number }[]; verified_only: boolean; school_id: string; require_shared_project: boolean; page: number; page_size: number }) => request<CandidateResult>("/candidates/search", { ...auth(token), method: "POST", body }),
};
