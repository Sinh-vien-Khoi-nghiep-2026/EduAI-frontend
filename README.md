# ArborCursus web frontend

React 19 application for the ArborCursus FastAPI API.

## Configure

```sh
cp .env.example .env
```

`BUN_PUBLIC_API_BASE_URL` is the API origin, without `/api/v1` and without a trailing slash. Configure the backend `CORS_ORIGINS` to the browser origin that serves this app.

## Run

```sh
bun install
bun dev
bun run build
```

The backend is bearer-token protected and ships only a native OIDC callback configuration. The connection screen therefore accepts an access token issued by an operator-configured identity-provider client. It stores the token in `sessionStorage`, never local storage.

Backend compatibility audit: [`docs/backend-contract.md`](docs/backend-contract.md). Prototype gap analysis: [`docs/frontend-gap-analysis.md`](docs/frontend-gap-analysis.md).
