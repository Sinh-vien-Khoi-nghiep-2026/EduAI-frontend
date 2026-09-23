# Session log — Browser login (OIDC Authorization Code + PKCE)

Ghi lại quá trình, tiến trình và ý tưởng của phiên triển khai login trình duyệt thay thế cho "dán token thủ công". Ngày: 2026-09-23.

## Bối cảnh / vấn đề

- App hiện chỉ đăng nhập bằng cách **dán bearer access token** thủ công trên `/connect` (`src/pages/Connect.tsx`), lưu vào `sessionStorage` (`src/auth/session.tsx`, `src/auth/session-transaction.ts`).
- Backend là **resource server thuần** (FastAPI), không có endpoint login/token. Token do **Keycloak** cấp qua OIDC Authorization Code + PKCE S256.
- `/auth/config` (`GET /api/v1/auth/config`) hiện **hardcode** `client_id=arborcursus-mobile` + `redirect_uri=arborcursus://oauth/callback` (native), theo `backend-reference.md` §2.2. Realm Keycloak chỉ có 2 client: `arborcursus-mobile` (public, native, `webOrigins: []`) và `arborcursus-api` (bearerOnly). **Chưa có web/SPA client**, PKCE chỉ set method chưa `required` (`realm.json:10`).

## Quyết định đã chốt (hỏi user)

1. **Có auto-refresh** — access token Keycloak chỉ sống `expires_in: 300` giây; refresh qua `grant_type=refresh_token` trước khi hết hạn.
2. **Giữ token-paste làm fallback** — backend chưa có web client nên PKCE chưa chạy được end-to-end; app phải vẫn dùng được.
3. **Không thêm env override** — dùng thẳng `/auth/config`; khi `redirect_uri` không phải HTTP thì UI hiện cảnh báo và không redirect (không nhảy vào luồng chết).

## Sửa chú thích sai (đối chiếu code + Keycloak thực tế)

- **Trước (sai)**: "backend chỉ cần thêm web client" → **Thực tế**: `/auth/config` hardcode native client của backend `app/api/v1/auth/router.py:14,19`; phải đổi backend + setting mới để trả web `client_id`/`redirect_uri`.
- **CORS**: đã ổn cho localhost — backend default `http://localhost:8081` (`app/core/config.py:19`, `CORSMiddleware` `app/main.py:12-18`). Không cần sửa.
- Citation đúng: `docs/backend-reference.md:144,312-313` (không có `backend-contract.md`). §2.2 = native flow; §2.3 = cảnh báo SPA chưa login được.

## Việc backend/operator cần làm (ngoài phạm vi repo frontend)

1. Keycloak realm `arborcursus`: thêm **web public client** (`pkce.required=true`, PKCE S256) + redirect URI HTTP (vd `http://localhost:8081/callback`) + `webOrigins` = origin SPA.
2. Backend: thêm setting `oidc_web_client_id` + `oidc_web_redirect_uri` (`app/core/config.py`) và trả chúng trong `/auth/config` (`app/api/v1/auth/router.py`).
3. CORS: **không cần đụng** (sẵn có 8081).

## Triển khai

### Luồng đích
1. `/connect` → `GET /auth/config`. Nếu `redirect_uri` là HTTP → nút "Sign in" mở luồng PKCE; nếu native → hiện cảnh báo + giữ ô dán token.
2. `beginLogin`: sinh `verifier`/`challenge` (base64url + SHA-256) + `state`, fetch `discovery_url` lấy `authorization_endpoint`, lưu `{state, verifier, from}` vào `sessionStorage` (`arborcursus.oidc-pending`), rồi `window.location.assign(authUrl)`.
3. User login trên Keycloak → redirect về `/callback?code=...&state=...`.
4. `/callback`: kiểm tra `state` (chống CSRF), POST `token_endpoint` form-encoded `grant_type=authorization_code&client_id&code&redirect_uri&code_verifier` → `{access_token, refresh_token, expires_in}`.
5. `connectOidc`: lưu access + refresh + expires (sessionStorage), seed query cache → ProtectedRoute tự bootstrap `me`.
6. **Auto-refresh**: timer trước expiry 60s gọi `refresh_token`; 401 bất kỳ cũng quy về `refresh` (single-flight); không có refresh token hoặc refresh fail → `signOut`.

### File thay đổi
| File | Nội dung |
|---|---|
| `src/auth/oidc.ts` (mới) | `base64url`, `generateVerifier`, `generateState`, `deriveChallenge`, `discover` (cache module-level + `clearDiscoveryCache` cho test), `authorizeUrl`, `exchangeCode`, `refreshAccess`. Token endpoint dùng `fetch` thô + `URLSearchParams` — KHÔNG đi qua `request()` (client.ts gắn base URL API + normalize lỗi FastAPI; Keycloak dùng shape `{error, error_description}`) |
| `src/auth/session-transaction.ts` | `beginLogin`, `readPendingLogin`, `clearPendingLogin`, keys mới `arborcursus.refresh-token` / `arborcursus.expires-at` / `arborcursus.oidc-pending`. Giữ nguyên `connectSession` (fallback) |
| `src/auth/session.tsx` | `connectOidc`, `refresh` (single-flight), handler 401 → refresh-or-signOut, timer refresh. `signOut` xóa thêm key mới |
| `src/pages/Connect.tsx` | Khối "Sign in" + divider + cảnh báo khi `redirect_uri` native; ô dán token thành fallback |
| `src/pages/Callback.tsx` (mới) | Đọc `code`/`state`/`error`, verify state, exchange, `connectOidc`, navigate về `from`. Guard `handled` ref chống StrictMode double-effect |
| `src/App.tsx` | Route `/callback` **public** (ngoài `ProtectedRoute`) |
| `src/index.css` | `.connect-signin`, `.connect-divider`, `.connect-warn` |
| `src/auth/oidc.test.ts` (mới) | PKCE determinism, URL params, discovery cache, exchange/refresh body, error mapping |
| `src/auth/session-transaction.test.ts` | Mở rộng: `beginLogin`/`readPendingLogin`/`clearPendingLogin` (stub `sessionStorage`) |

### Quyết định kỹ thuật
- **Storage**: giữ `sessionStorage` (chuẩn README "never local storage"); refresh token cũng trong sessionStorage. Không validate `id_token` (backend từ chối ID-type token) → bỏ `nonce`, chỉ dùng `state`.
- **Refresh-rescue thay vì gating me**: chuyển `expiredToken`/gating sang handler 401 → `refresh` (tránh lỗi lint `react-hooks/purity` về `Date.now()` trong render và `set-state-in-effect`). `me` luôn enable; 401 → refresh; không có refresh token → signOut.
- Không dùng npm package OIDC nào (không `oidc-client-ts`) — tự viết PKCE để giữ tối giản, đúng chuẩn lazy.

## Gặp phải trong phiên

- Test thất bại ban đầu:
  1. Cache `discover` dính chéo giữa các test file trong `bun test` (module state chia sẻ qua process) → thêm `clearDiscoveryCache()` trong `beforeEach` cả 2 file test, export helper.
  2. `tokenRequest` nuốt lỗi của chính nó trong `catch` chung ("The identity provider returned..." bị đổi thành "...could not be reached") → tách `fetch` ra khỏi `try`; chỉ bọc network error. Đã thêm test error-mapping.
  3. Lint: `preserve-caught-error` → thêm `{ cause: error }`; `react-hooks/purity` chặn `Date.now()` trong render; `react-hooks/set-state-in-effect` chặn setState sync trong effect → thiết kế lại refresh-rescue ở handler 401.
- **Undo 1 lần** (user yêu cầu "undo lại phát" giữa chừng): restore hết rồi áp lại toàn bộ theo todo này.

## Trạng thái hiện tại

- [x] PKCE helpers + discovery + exchange + refresh (`oidc.ts`)
- [x] `beginLogin`/pending + storage keys (`session-transaction.ts`)
- [x] `connectOidc` + auto-refresh + rescue-401 (`session.tsx`)
- [x] Connect page sign-in + fallback + cảnh báo native redirect
- [x] Callback page + route public
- [x] CSS
- [x] Tests: `bun test` **30 pass / 0 fail**; `bun run lint` OK; `bun run typecheck` OK; `bun run build` OK
- [ ] Chạy PKCE end-to-end thật — **chờ backend** khai client web + trả web `client_id`/`redirect_uri` (xem mục "Việc backend/operator cần làm").

## Ý tưởng / việc tiếp theo

- Khi backend xong: thử PKCE thật trên `http://localhost:8081`, kiểm tra callback + refresh rotation.
- Hiện chỉ lưu access token cho bảng điều hướng; có thể thêm `end_session_endpoint` cho Keycloak logout khi signOut (chưa làm, min scope).
- Phân tích port sang React Native (đã hỏi/ướm): auth layer phụ thuộc `sessionStorage` + `window.location` → cần thay bằng deep link/AppAuth; phần API client + models port được gần như nguyên vẹn.