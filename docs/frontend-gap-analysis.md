# Frontend gap analysis

## Existing prototype

The repository is a Bun-served React 19 + TypeScript + Tailwind 4 application. It already includes React Router, TanStack Query, Axios, Lucide, Base UI/shadcn-compatible primitives, and a strict `tsconfig`.

The executable product was one `/` route. It rendered a prototype sidebar/header and hard-coded course content (`Quantum Mechanics III`) unrelated to ArborCursus. The server exposed demo `/api/hello` routes. There was no API client, session model, authentication, backend DTO typing, data-fetching, forms, error normalization, protected routing, useful navigation, test script, or frontend environment example. The dark root, animated logo wallpaper, and generic template copy were visually and semantically incompatible with a calm production application.

## Reuse and removal

- **Reuse:** Bun/React/Tailwind build setup, Router, TanStack Query, Lucide, strict TypeScript configuration, and the `@/*` path alias.
- **Remove from execution:** course-oriented home widgets, mock search, fake notification indicator, demo API routes, dark-only template shell, and the initial one-page route.
- **Do not expose:** invented courses, learning paths, AI chat, dashboards with fabricated metrics, integration connect buttons, file uploads, or management actions unavailable in the API.

## Backend capability gaps

The prototype represented none of the actual profile, skill, skill-tree, evidence, academic record, achievement, project, organization, recruiter-search, integration, or notification capabilities. It also had no concept of organization approval/membership roles, evidence verification, asynchronous skill-tree reconciliation, or bearer-token OIDC security.

ArborCursus itself has constraints the UI cannot close: no browser OIDC client/callback, no evidence list, no grant/membership management, and no edit/delete APIs for several user-owned resources. The rebuilt UI makes those constraints explicit rather than inventing unsupported behavior.

## Architecture implemented

- **Transport:** one native `fetch` client, configurable `BUN_PUBLIC_API_BASE_URL`, bearer token injection, query encoding, JSON/204 handling, and FastAPI error normalization.
- **Domain layer:** typed endpoint functions in `src/api/arbor.ts`; pages never call `fetch` directly.
- **State:** TanStack Query for all server state; session context owns only access token/current-user lifecycle.
- **Routing:** public access-token connection screen; protected application shell with role-aware navigation and direct routes.
- **UX:** shared page header, status badge, empty/error/loading states, confirmation dialog, responsive shell, accessible fields, and forms whose constraints reflect observable backend rules.

## Implementation sequence

1. Audit and document backend contract and prototype gaps.
2. Replace demo runtime with typed transport, session state, query client, route protection, and design tokens.
3. Build profile, skill progress, records, portfolio, organizations, notifications, integrations, evidence/review, and recruiter-search workflows from real endpoint contracts.
4. Delete prototype execution paths, verify desktop/mobile routes, then run tests, typecheck, and production build.
