# ArborCursus web frontend

React 19 application for the ArborCursus FastAPI API.

## Configure

```sh
cp .env.example .env
```

`BUN_PUBLIC_API_BASE_URL` is the API origin, without `/api/v1` and without a trailing slash. It is the only environment-variable prefix exposed to browser code. The application shows a configuration error instead of making accidental same-origin API calls when it is absent.

## Local development

```sh
bun install
bun dev
```

The frontend serves at `http://localhost:8081`. ArborCursus defaults `CORS_ORIGINS` to that same origin. If you use another origin, set the backend `CORS_ORIGINS` to include its exact browser origin, for example:

```sh
CORS_ORIGINS=http://localhost:8081
```

The API defaults to `http://localhost:8000`, so the example environment file works with the backend's documented local setup.

## Docker

```sh
BUN_PUBLIC_API_BASE_URL=https://api.example.com docker compose up --build
```

Compose publishes `http://localhost:8081` to the server's `PORT=8081`. The container runs Bun's source server, which compiles browser modules when served; `BUN_PUBLIC_API_BASE_URL` is therefore read from the running container environment. This differs from `bun run build`: that command emits a static bundle and inlines its public environment at build time.

## Quality checks

```sh
bun run typecheck
bun run test
BUN_PUBLIC_API_BASE_URL=http://localhost:8000 bun run build
```

The test script supplies a local API origin only to exercise the transport without weakening the runtime configuration requirement. The production build verifies that generated browser JavaScript does not retain a `process.env.*` reference.

The backend is bearer-token protected and ships only a native OIDC callback configuration. The connection screen therefore accepts an access token issued by an operator-configured identity-provider client. It stores the token in `sessionStorage`, never local storage.

Backend compatibility audit: [`docs/backend-contract.md`](docs/backend-contract.md). Prototype gap analysis: [`docs/frontend-gap-analysis.md`](docs/frontend-gap-analysis.md).
