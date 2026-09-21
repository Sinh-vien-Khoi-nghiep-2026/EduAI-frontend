# ArborCursus backend contract

Audited from the FastAPI source, database models, configuration, and tests in `ArborCursus` on 2026-09-21. The API base path is `/api/v1`; local API origin is `http://localhost:8000`.

## Product domains and actors

- **Learners** create a profile, self-report skill levels, evidence, academic records, achievements, projects, organization memberships, and sharing preferences exposed through profile fields.
- **Organization members** see their organizations. An approved organization member with role `reviewer` or `admin` may review evidence when the learner belongs to or has shared verification/evidence scope with that organization.
- **Recruiters** require an approved `company` membership with role `recruiter` or `admin`; candidate search additionally requires learner opt-in, active organization-scoped sharing, verified skills by default, and a shared non-private project by default.
- **Platform administrators** may create taxonomy skills only when the configured JWT claim is truthy (unless the operator enables the local demo claim bypass).

The membership database enum is `member | recruiter | reviewer | admin | platform_admin`. The API does not expose membership administration, sharing grant administration, evidence listing, project mutation after creation, academic-record mutation, achievement deletion, or browser-oriented OAuth configuration.
## Authentication and transport

The API is an OIDC resource server, not an identity provider. Every endpoint below except `GET /auth/config` and health requires `Authorization: Bearer <access token>`. It verifies issuer, audience, expiry/not-before, allowed access token `typ` (`Bearer` or `at+jwt`) and RS256 signature using issuer-pinned JWKS. ID tokens and social-provider tokens are rejected.

`GET /auth/config` is configured for the native client `arborcursus-mobile` with Authorization Code + PKCE S256 and redirect URI `arborcursus://oauth/callback`. Keycloak owns login, token refresh, and logout. No login, registration, refresh, password, or web callback endpoint exists in ArborCursus.

CORS allows configured origins (`http://localhost:8081` by default) and credentials, but authorization is bearer-token based. The frontend must use a configurable API origin (`BUN_PUBLIC_API_BASE_URL` in this app) and must not hardcode an API host.

The frontend serves locally at `http://localhost:8081` to match the backend default. Browser builds inline only `BUN_PUBLIC_*` environment variables; an absent `BUN_PUBLIC_API_BASE_URL` shows a configuration error rather than falling back to the frontend origin.

Errors are FastAPI HTTP errors: most policy/domain errors use `{"detail":{"code":"..."}}`; request validation uses `{"detail":[{...}]}`. Clients must also handle empty 204 responses.

## Endpoint inventory

| Domain | Method | Endpoint | Request | Response | Auth/permission | Notes |
|---|---|---|---|---|---|---|
| Auth | GET | `/auth/config` | — | issuer, discovery URL, client ID, audience, scopes, `pkce`, grant type, native redirect URI | Public | Configuration only; does not authenticate a browser. |
| Profile | GET | `/users/me` | — | id, display_name?, email?, profile_public, recruiter_searchable | Bearer | Creates local user on first valid token. |
| Profile | PATCH | `/users/me` | any of display_name? (max 200), profile_public?, recruiter_searchable? | current profile | Owner | Partial update. |
| Organizations | GET | `/organizations/mine` | — | `[{id,name,kind,role,approved}]` | Bearer | Used for role-aware UI. |
| Organizations | POST | `/organizations` | name (1–250), kind | id, approved, role=`member` | Bearer | New organizations are unapproved. |
| Taxonomy | GET | `/skills` | — | `[{id,stable_id,name,parent_id?}]` | Public | Ordered by stable ID. |
| Taxonomy | POST | `/skills` | stable_id (1–150; lowercase alphanumeric start plus `._-`), name (1–200), path (max 500), parent_id? | id, stable_id, name | Platform-admin JWT claim | Rejects duplicates and unsafe path identifiers. |
| Skill progress | GET | `/skills/me` | — | `{user_id,nodes:[{skill_id,stable_id,name,level,status}],edges:[{from,to}]}` | Owner | Projection of selected skills. |
| Skill progress | PUT | `/skills/me/progress` | skill_id, level (0–10), evidence_id? | skill_id, level, status | Owner; evidence must be owned | Queues durable skill-tree reconciliation; status becomes `self_reported` on update. |
| Skill progress | DELETE | `/skills/me/progress/{stable_id}` | — | 204 | Owner | Queues reconciliation. |
| Skill tree | GET | `/skill-trees/me` | — | `{user_id,nodes,edges:[]}` | Owner | ObjectTree snapshot; asynchronous reconciliation may lag the progress projection. |
| Evidence | POST | `/evidence/me` | source (1–50), external_id? (max 500), url?, title (1–300), data object | id, revision, status | Owner | No evidence list endpoint. |
| Evidence | PATCH | `/evidence/{id}` | same as create | id, revision, status | Owner | Changes reset verification and invalidate earlier verified revisions. |
| Evidence review | POST | `/evidence/{id}/review` | organization_id, status `verified|rejected|revoked`, note? | id, status, evidence_revision | Approved reviewer/admin plus learner scope/share | No review queue/list endpoint. |
| Academic records | GET | `/academic-records/me` | — | records with subject, term, original_grade, grading_scale, credits?, status | Owner | No update/delete endpoint. |
| Academic records | POST | `/academic-records/me` | subject (max 200), term (max 100), original_grade (max 100), grading_scale (max 100), credits? | id, status plus submitted fields | Owner | Empty strings are accepted by backend. |
| Achievements | GET | `/achievements/me` | — | achievements with id, title, kind, url?, status, revision | Owner | Ordered by ID. |
| Achievements | POST | `/achievements/me` | title (1–300), kind (1–40), url?, data object | id, title, status | Owner | `data` defaults to object. |
| Achievements | PATCH | `/achievements/me/{id}` | same as create | id, status, revision | Owner | Replaces all fields and resets status. |
| Projects | GET | `/projects/me` | — | `[{id,name,url?,visibility,source}]` | Owner | No project update/delete endpoint. |
| Projects | POST | `/projects/me` | name (1–300), url?, visibility (unconstrained string; default `private`), data object | id, name, visibility | Owner | Frontend must not invent visibility enum values. |
| Candidate search | POST | `/candidates/search` | organization_id, match `all|any`, skills (1–50 of stable skill ID and 0–10 min level), verified_only=true, school_id?, require_shared_project=true, page>=1, page_size 1–100 | `{items:[{id,display_name?}],page,page_size}` | Approved company recruiter/admin | Deliberately has no total. |
| Integrations | GET | `/integrations` | — | LinkedIn availability plus persisted connection rows | Owner | No connect/disconnect endpoint. LinkedIn deep/profile/course/achievement sync is unsupported. |
| Notifications | GET | `/notifications` | — | `[{id,kind,body,read,created_at}]` | Owner | Latest first, no pagination. |
| Notifications | POST | `/notifications/{id}/read` | — | `{read:true}` | Owner | 404 for another/missing notification. |
| Webhook | POST | `/webhooks/github` | Raw signed GitHub payload + required GitHub headers | accepted, ignored, duplicate, delivery_id | GitHub HMAC, not user auth | Server-to-server only; not frontend UI. |

## Asynchronous and integration behavior

- Skill progress writes enqueue `skill_tree.reconcile`; the worker reconciles the ObjectTree file repository. The SQL progress endpoint is immediate, but the `/skill-trees/me` snapshot can be delayed.
- GitHub webhooks persist then queue a durable worker job; no frontend ingestion screen is appropriate.
- GitHub App installation mapping and reconciliation are operator-provisioned, not user-configurable in this API.
- LinkedIn exposes login/basic-profile availability only; do not create fake course/certificate/deep-sync UI.

## Backend limitations relevant to the web frontend

1. The supplied `/auth/config` names only a native callback, so a standards-compliant browser sign-in cannot be completed without an operator-provisioned web OIDC client and redirect URI.
2. Evidence can be created/updated/reviewed only when IDs are known; there is no owner evidence collection endpoint.
3. Sharing grants and memberships can be read but not administered. Candidate-search eligibility can be displayed but cannot be repaired from the web app.
4. Several resources are create/read-only by API contract; the UI deliberately does not imply edit/delete support where it does not exist.
