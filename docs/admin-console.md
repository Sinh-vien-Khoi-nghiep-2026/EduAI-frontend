# Admin console

Administrative workspace for ArborCursus web (`/admin`), built against the API as implemented in
`ArborCursus` — not against older planning documents.

## What the backend actually exposes

Audited from FastAPI routers, `app/core/security.py`, `app/core/config.py`, and the live
`/openapi.json` of a locally running instance.

| Domain | Endpoint | Authorization | Console use |
|---|---|---|---|
| Taxonomy | `GET /api/v1/skills` | Public | List, filter, hierarchy |
| Taxonomy | `POST /api/v1/skills` | JWT `platform_admin` claim (configurable via `PLATFORM_ADMIN_CLAIM`) | Create skill |
| Evidence review | `POST /api/v1/evidence/{id}/review` | Approved organization + `reviewer`/`admin` membership; learner must belong to or share scope with that organization | Record decision on known evidence ID |
| Organizations | `GET /api/v1/organizations/mine` | Bearer | Access-scope view, reviewer eligibility |
| Profile | `GET /api/v1/users/me` | Bearer | Session identity |

`POST /skills` returns 403 `{"code":"platform_admin_required"}` for ordinary tokens and 409
`{"code":"skill_exists"}` for duplicates. Both are surfaced in the UI.

## Missing capabilities (backend blockers)

Documented, not faked. No screen, endpoint stub, or mock data exists for any of these.

1. **List users / change roles** — no `/users` collection endpoint. Required contract:
   `GET /api/v1/admin/users?page=&page_size=&query=` returning
   `{items:[{id,display_name,email,created_at,roles}],page,page_size,total}` plus
   `PATCH /api/v1/admin/users/{id}` for authorized role changes. Needs a platform-admin guard.
2. **List / approve organizations** — only `/organizations/mine` exists and it is scoped to the
   caller. Approval is an operator/DB action. Required contract:
   `GET /api/v1/admin/organizations?approved=` and `POST /api/v1/admin/organizations/{id}/approve`.
3. **Organization membership administration** — `memberships` is readable only through
   `/organizations/mine`; there is no create/update/delete. Required contract:
   `GET|POST|PATCH|DELETE /api/v1/admin/organizations/{id}/members[/{user_id}]`.
4. **Evidence review queue** — review requires a known evidence UUID; no listing exists. Required
   contract: `GET /api/v1/admin/evidence?status=&organization_id=&page=` returning evidence
   summaries, and an equivalent for pending reviews.
5. **Platform analytics** — no analytics endpoints. Every figure in the overview is counted from a
   real response (`GET /skills`, `GET /organizations/mine`) or omitted.
6. **Skill update/delete** — only `GET`/`POST` exist. Console deliberately shows no edit or delete
   controls.

## Authorization model

`src/auth/permissions.ts` derives capabilities client-side:

- `taxonomy.write` — strictly boolean `true` `platform_admin` claim in the JWT payload (matching backend `is_platform_admin`). Role containers are not consulted.
- `evidence.review` — at least one organization from `/organizations/mine` with `approved: true`
  and role `reviewer` or `admin`.
- `isReviewerOnly` — accounts with `evidence.review` that lack `taxonomy.write` and `users.manage`.

Rules enforced by `src/auth/AdminGuard.tsx` and tested in `src/auth/permissions.test.ts`:

- No token → redirect to `/connect` (no console content rendered).
- Session or membership list still loading → loading state, never partial admin content.
- No capability → "Restricted" notice, no tables, no data.
- Organization `admin` never implies `taxonomy.write`.
- Unapproved organization never grants `evidence.review`, even with an admin role.

The guard is a UI gate only. The backend remains the authority: a forged claim yields a visible
button that fails with 403. This is verified in `tests/admin.e2e.ts` (ordinary user gets 403 and is
never offered the action).

## Routes

| Route | Purpose | Capability |
|---|---|---|
| `/admin` | Overview: "Review Evidence" for reviewer-only; "Console overview" with platform metrics for platform admin | any |
| `/admin/taxonomy` | Tree list, filter, create with client+server validation | view: any; create: `taxonomy.write` |
| `/admin/reviews` | ID-based evidence decision within an eligible organization | `evidence.review` |
| `/admin/access` | Token capabilities, review scope, all memberships | any |

The console has its own shell (`AdminLayout`) as a sibling of the learner `AppLayout`, so the
workspace sidebar is never doubled. Accounts with only `evidence.review` see the entry link and
workspace titled **"Review Evidence"** with reviewer-scoped navigation, while platform admins and
multi-role accounts retain the full **"Admin console"**. "Back to workspace" returns.

## Local verification stack

Needs PostgreSQL, the API, an RS256 OIDC issuer, and the frontend.

```bash
# 1. PostgreSQL (throwaway, non-default port)
docker run -d --name arbor-pg -e POSTGRES_DB=arborcursus -e POSTGRES_USER=arbor \
  -e POSTGRES_PASSWORD=arbor -p 5433:5432 postgres:16.6-alpine

# 2. Backend env (repo root of ArborCursus; do not commit)
#    DATABASE_URL=postgresql+psycopg://arbor:arbor@127.0.0.1:5433/arborcursus
#    OIDC_ISSUER=http://127.0.0.1:8099/realms/arborcursus
#    OIDC_JWKS_URL=http://127.0.0.1:8099/realms/arborcursus/protocol/openid-connect/certs
#    CORS_ORIGINS=http://localhost:8081
uv run --frozen alembic upgrade head
uv run --frozen uvicorn app.main:app --host 127.0.0.1 --port 8000

# 3. Development identity provider (RS256 + JWKS + password grant, real tokens)
uv run --frozen python tests/fixtures/dev-idp.py     # http://127.0.0.1:8099

# 4. Frontend
BUN_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 bun --hot src/index.ts   # http://localhost:8081
```

Dev identities (development only, never real credentials; all seeded in
`tests/fixtures/dev-idp.py`): `admin@local.dev` / `admin` (`platform_admin: true`),
`reviewer@local.dev` / `reviewer`, `recruiter@local.dev` / `recruiter` (candidate
search), `student@local.dev` / `student`, `student2@local.dev` / `student2`.
Reviewer eligibility requires an approved organization membership; grant it with
`ALTER`-style operator SQL or a seed — there is no API for it (see blocker 3).

Checks:

```bash
bun run lint && bun run typecheck && bun test
BUN_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 bun run build
bunx playwright test            # requires the stack above
```

Note: `dist/` in this checkout is owned by `root`, so `bun run build` cannot clear it. Build to a
different directory, or `sudo rm -rf dist` once.

## Tests

- `src/auth/permissions.test.ts` — claim decoding, backend truthiness, org-vs-platform separation,
  approval requirement, console gating.
- `src/features/taxonomy.test.ts` — hierarchy build, orphan handling, ancestor-preserving filter,
  cycle safety, identifier/path validation mirroring the backend.
- `tests/admin.e2e.ts` — Playwright against the live stack: real sign-in, taxonomy create,
  409 handling, reviewer without platform admin, ordinary-user denial on all four routes,
  unauthenticated redirect, mobile drawer, six viewports with overflow assertions, and a real
  evidence review persisted through the API.

Screenshots land in `tests/screenshots/` (per route per viewport, plus validation/conflict/receipt
states).

## Security notes found during the audit

- `accessToken.txt` is **tracked in git** at the repository root. Treat any token it contained as
  compromised, remove the file from history, and keep it ignored. The console code never reads it.
- `src/pages/Connect.tsx` signs in with the OIDC **password grant** while
  `src/auth/session-transaction.ts` and `/callback` implement Authorization Code + PKCE. The
  password grant bypasses the redirect-URI model and should be retired; the PKCE path exists but is
  not wired into the sign-in screen.
- `/auth/config` advertises only the native client `arborcursus-mobile` with
  `arborcursus://oauth/callback`, so a standards-compliant browser login needs an
  operator-provisioned web client and redirect URI. Neither was changed here.
