import { request } from "./client";

export type User = { id: string; display_name: string | null; email: string | null; profile_public: boolean; recruiter_searchable: boolean };
export type Organization = { id: string; name: string; kind: string; role: "member" | "recruiter" | "reviewer" | "admin" | "platform_admin"; approved: boolean };
export type Skill = { id: string; stable_id: string; name: string; parent_id: string | null };
export type SkillProgress = { skill_id: string; stable_id: string; name: string; level: number; status: string };
export type SkillTree = { user_id: string; nodes: SkillProgress[]; edges: { from: string; to: string }[] };
export type AcademicRecord = { id: string; subject: string; term: string; original_grade: string; grading_scale: string; credits: string | null; status: string };
export type Achievement = { id: string; title: string; kind: string; url: string | null; status: string; revision: number };
export type Project = { id: string; name: string; url: string | null; visibility: string; source: string };
export type Notification = { id: string; kind: string; body: Record<string, unknown>; read: boolean; created_at: string };
export type Integration = { provider: string; status: string; capabilities: Record<string, boolean>; unsupported?: string[]; last_sync_at: string | null; error?: string | null };
export type CandidateResult = { items: { id: string; display_name: string | null }[]; page: number; page_size: number };
export type AuthConfig = { issuer: string; discovery_url: string; client_id: string; audience: string; scopes: string[]; pkce: "S256"; grant_type: "authorization_code"; redirect_uri: string };
export type EvidenceCreated = { id: string; revision: number; status: string };
export type EvidenceReview = { id: string; status: string; evidence_revision: number };

const auth = (token: string) => ({ token });
export const arbor = {
  authConfig: () => request<AuthConfig>("/auth/config"),
  me: (token: string) => request<User>("/users/me", auth(token)),
  updateMe: (token: string, body: Partial<Omit<User, "id" | "email">>) => request<User>("/users/me", { ...auth(token), method: "PATCH", body }),
  organizations: (token: string) => request<Organization[]>("/organizations/mine", auth(token)),
  createOrganization: (token: string, body: { name: string; kind: string }) => request<{ id: string; approved: boolean; role: string }>("/organizations", { ...auth(token), method: "POST", body }),
  skills: () => request<Skill[]>("/skills"),
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
  createEvidence: (token: string, body: { source: string; external_id?: string; url?: string; title: string; data: Record<string, never> }) => request<EvidenceCreated>("/evidence/me", { ...auth(token), method: "POST", body }),
  reviewEvidence: (token: string, id: string, body: { organization_id: string; status: "verified" | "rejected" | "revoked"; note?: string }) => request<EvidenceReview>(`/evidence/${id}/review`, { ...auth(token), method: "POST", body }),
  notifications: (token: string) => request<Notification[]>("/notifications", auth(token)),
  markNotificationRead: (token: string, id: string) => request<{ read: true }>(`/notifications/${id}/read`, { ...auth(token), method: "POST" }),
  integrations: (token: string) => request<Integration[]>("/integrations", auth(token)),
  candidateSearch: (token: string, body: { organization_id: string; match: "all" | "any"; skills: { skill_id: string; min_level: number }[]; verified_only: boolean; require_shared_project: boolean; page: number; page_size: number }) => request<CandidateResult>("/candidates/search", { ...auth(token), method: "POST", body }),
};
