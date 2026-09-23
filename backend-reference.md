# Tài liệu tham chiếu Backend ArborCursus (dành cho Frontend/Mobile)

Mọi URL, tên trường, scope trong tài liệu này đều đối chiếu trực tiếp từ mã nguồn
(`app/`), `compose.yaml`, `keycloak/arborcursus-realm.json` và OpenAPI thực tế
(`http://localhost:8000/openapi.json`). Không bịa ra endpoint hay field nào.

---

## 1. Tổng quan dự án

ArborCursus là backend monolith dạng module (modular monolith) bằng **FastAPI +
PostgreSQL**. PostgreSQL là nơi lưu dữ liệu có thể tìm kiếm (người dùng, taxonomy
kỹ năng, tiến độ kỹ năng, bằng chứng, hồ sơ học tập, tổ chức, project, thông báo,
webhook delivery, job). Mỗi người dùng có một repository **ObjectTree** riêng
(thư mục riêng biệt trên đĩa) để lưu lịch sử versioned của skill tree; worker
đồng bộ projection sang PostgreSQL.

- **Stack**: FastAPI 0.115 (`app/main.py`), SQLAlchemy 2.0 async-style + PostgreSQL 16,
  **Keycloak 26.7.4** làm OIDC identity provider (chỉ broker cho GitHub/LinkedIn login),
  worker viết bằng Python (`scripts/worker.py`, dùng bảng `jobs` trong PostgreSQL —
  **không có Redis**, không có Celery/RQ).
- **Chạy local**:
  ```bash
  cp .env.example .env
  docker compose up --build        # postgres + keycloak + migrate + api + worker
  ```
- **Base URLs**:
  - API: `http://localhost:8000` — route API đều có prefix `/api/v1`.
  - Keycloak: `http://localhost:8080` — realm `arborcursus`.
  - OpenAPI / Swagger UI: `http://localhost:8000/docs`, JSON: `http://localhost:8000/openapi.json`.
  - Keycloak admin console: `http://localhost:8080` (đăng nhập với bootstrap user `admin`/`admin`, xem `compose.yaml`).
- **Health**: `GET http://localhost:8000/health/live` (`{"status":"ok"}`),
  `GET http://localhost:8000/health/ready` (thực hiện kết nối DB rồi trả `{"status":"ok"}`).

---

## 2. Xác thực — phần DUY NHẤT frontend cần để lấy token

Backend là **resource server**: nó KHÔNG có endpoint đăng nhập. Token do
**Keycloak** cấp. API chỉ kiểm tra JWT access token bạn gửi kèm trong header
`Authorization: Bearer <token>`.

### 2.1 Discovery entrypoint

`GET http://localhost:8000/api/v1/auth/config` — không cần auth, trả về toàn bộ
thông tin cần để bắt đầu luồng OIDC (xác định `app/api/v1/auth/router.py`):

```json
{
  "issuer": "http://localhost:8080/realms/arborcursus",
  "discovery_url": "http://localhost:8080/realms/arborcursus/.well-known/openid-configuration",
  "client_id": "arborcursus-mobile",
  "audience": "arborcursus-api",
  "scopes": ["openid", "profile", "email"],
  "pkce": "S256",
  "grant_type": "authorization_code",
  "redirect_uri": "arborcursus://oauth/callback"
}
```

Từ `discovery_url` Keycloak trả thêm (đã xác minh bằng cách gọi trực tiếp):
- `authorization_endpoint`: `http://localhost:8080/realms/arborcursus/protocol/openid-connect/auth`
- `token_endpoint`: `http://localhost:8080/realms/arborcursus/protocol/openid-connect/token`
- `jwks_uri`: `http://localhost:8080/realms/arborcursus/protocol/openid-connect/certs`
- `end_session_endpoint`: `http://localhost:8080/realms/arborcursus/protocol/openid-connect/logout`

### 2.2 Luồng Authorization Code + PKCE S256 (đúng 5 bước)

Client `arborcursus-mobile` là **public client** (không có client secret —
`"publicClient": true` trong realm file), bắt buộc PKCE S256
(`"pkce.code.challenge.method": "S256"`), redirect URI chính xác
`arborcursus://oauth/callback` (`"redirectUris": ["arborcursus://oauth/callback"]`).

**Bước 1 — Sinh verifier & challenge:**
```js
const verifier = base64url(randomBytes(32));            // 43-128 ký tự
const challenge = base64url(sha256(verifier));          // PKCE S256
```

**Bước 2 — Mở trình duyệt hệ thống** (system browser, KHÔNG dùng WebView) tới:
```
http://localhost:8080/realms/arborcursus/protocol/openid-connect/auth
  ?response_type=code
  &client_id=arborcursus-mobile
  &redirect_uri=arborcursus://oauth/callback
  &scope=openid%20profile%20email
  &code_challenge=<challenge>
  &code_challenge_method=S256
  &state=<random-state>
  &nonce=<random-nonce>
```
Người dùng đăng nhập trên trang Keycloak (Keycloak có thể redirect sang GitHub/LinkedIn
nếu đã cấu hình provider; realm local không kèm secret provider — xem `docs/integrations.md`).

**Bước 3 — Bắt callback:** Keycloak redirect về custom scheme:
```
arborcursus://oauth/callback?code=<authorization-code>&state=<random-state>
```
Kiểm tra `state` khớp. `code` chỉ dùng được MỘT lần.

**Bước 4 — Đổi code lấy token** tại token endpoint, body dạng `application/x-www-form-urlencoded` (public client, **không** có `client_secret`):
```
POST http://localhost:8080/realms/arborcursus/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&client_id=arborcursus-mobile
&code=<authorization-code>
&redirect_uri=arborcursus://oauth/callback
&code_verifier=<verifier>
```

**Bước 5 — kết quả** (dùng SDK Keycloak/custom client cũng vậy):
```json
{
  "access_token": "eyJ...",
  "expires_in": 300,
  "refresh_token": "eyJ...",
  "id_token": "eyJ...",
  "token_type": "Bearer"
}
```
- Gửi `access_token` ở header `Authorization: Bearer <access_token>` cho mọi request cần auth.
- Khi hết `expires_in`, đổi `refresh_token` tại **cùng token endpoint** với
  `grant_type=refresh_token&client_id=arborcursus-mobile&refresh_token=...&scope=openid profile email`.
- Lưu token trong secure storage (iOS Keychain / Android Keystore), đừng dùng
  AsyncStorage trần. Chi tiết thêm tại `docs/mobile-auth.md`.

### 2.3 ⚠️ CẢNH BÁO QUAN TRỌNG — hiện tại KHÔNG có client web/SPA

Realm file `keycloak/arborcursus-realm.json` chỉ khai báo HAI client:
- `arborcursus-mobile`: public, PKCE S256, redirect URI duy nhất `arborcursus://oauth/callback`.
- `arborcursus-api`: `bearerOnly` (dùng để gán audience, không phải để login).

**Không có client OIDC dành cho web/SPA và không có redirect URI trình duyệt nào
(HTTP) được đăng ký.**

- Nếu frontend là **React Native**: PKCE trong system browser chạy OK NGAY — bạn
  xử lý `arborcursus://` scheme bằng deep link và nói chuyện thẳng với Keycloak
  như mô tả ở 2.2. Không cần đợi backend.
- Nếu frontend là **SPA chạy trong trình duyệt (web)**: **KHÔNG THỂ đăng nhập**
  cho đến khi backend cấu hình thêm một client OIDC web + redirect URI HTTP (ví dụ
  `http://localhost:8081/callback`) trong Keycloak, và chắc chắn origin của web
  được thêm vào `CORS_ORIGINS` (mặc định chỉ `http://localhost:8081`,
  cấu hình `app/core/config.py`). Cần có task/cấu hình phía backend trước.

### 2.4 Quy tắc API xác thực token (để biết "được/chưa")

Qúa trình verify nằm ở `app/core/security.py`, các giá trị cấu hình ở
`app/core/config.py` (đọc từ env):

| Rule | Giá trị | Ghi chú |
|---|---|---|
| Algorithm | `RS256` (`OIDC_ALGORITHMS`) | JWT header `alg` phải nằm trong allowlist |
| Issuer | `http://localhost:8080/realms/arborcursus` (`OIDC_ISSUER`) | khớp chính xác |
| Audience | `arborcursus-api` (`OIDC_AUDIENCE`) | claim `aud` của access token |
| Token type (header `typ`) | `Bearer` hoặc `at+jwt` | bắt buộc có `kid`; ID token (`typ=ID`) bị từ chối |
| Claims bắt buộc | `exp`, `iss`, `sub`, `aud` | leeway 30s (`jwt_clock_skew_seconds`) |
| Khóa | JWKS URL (cache 300s, cố định từ cấu hình, không lấy từ token) | kid lạ bị từ chối cho tới khi cache refresh |

Lỗi cốt lõi khi token hỏng:
```json
{ "detail": { "code": "invalid_token", "message": "Access token is invalid" } }
```
Thiếu header:
```json
{ "detail": { "code": "missing_token", "message": "Bearer access token required" } }
```
Cả hai đều kèm header `WWW-Authenticate: Bearer` và HTTP 401.

**Ghi chú quan trọng**: do xác thực offline (chỉ verify JWT), access token đã cấp
có thể vẫn được chấp nhận tới hết `exp` dù người dùng đã logout — logout không
hủy token tức thời. Lượt gọi API đầu tiên có token hợp lệ sẽ **tự tạo tài khoản
`User`** trong hệ thống từ claim `name`/`email` của token (dependency `current_user`
trong `app/api/dependencies.py`), nên một người dùng Keycloak mới dùng được ngay.

---

## 3. Tham chiếu API (đầy đủ mọi route thực tế)

Liệt kê nguyên vẹn từ `openapi.json` của server đang chạy. Base path chung:
`/api/v1`. "Auth" nghĩa là cần `Authorization: Bearer <access_token>`.

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/auth/config` | ✖ | Discovery OIDC (xem 2.1) |
| GET | `/users/me` | ✔ | Profile người dùng hiện tại |
| PATCH | `/users/me` | ✔ | Cập nhật `display_name`, `profile_public`, `recruiter_searchable` |
| GET | `/skills` | ✖ | Danh sách taxonomy (cây kỹ năng gốc) |
| POST | `/skills` | ✔* | Tạo kỹ năng taxonomy (*cần claim `platform_admin` hoặc `ALLOW_DEMO_TAXONOMY_CLAIM=true`) |
| GET | `/skills/me` | ✔ | Tiến độ kỹ năng của user: nodes + edges |
| PUT | `/skills/me/progress` | ✔ | Gán level (0–10) cho kỹ năng, có thể kèm `evidence_id` |
| DELETE | `/skills/me/progress/{stable_id}` | ✔ | Xóa tiến độ kỹ năng (HTTP 204) |
| GET | `/skill-trees/me` | ✔ | Snapshot ObjectTree (lịch sử versioned) của user |
| GET | `/academic-records/me` | ✔ | Danh sách hồ sơ học tập |
| POST | `/academic-records/me` | ✔ | Thêm hồ sơ học tập |
| GET | `/achievements/me` | ✔ | Danh sách thành tích |
| POST | `/achievements/me` | ✔ | Thêm thành tích |
| PATCH | `/achievements/me/{item_id}` | ✔ | Sửa thành tích (tăng revision, reset về tự khai báo) |
| POST | `/evidence/me` | ✔ | Thêm bằng chứng (evidence) |
| PATCH | `/evidence/{evidence_id}` | ✔ | Sửa bằng chứng của mình (reset trạng thái verify) |
| POST | `/evidence/{evidence_id}/review` | ✔ | Reviewer được duyệt duyệt/từ chối/revoke bằng chứng |
| GET | `/projects/me` | ✔ | Danh sách project của user |
| POST | `/projects/me` | ✔ | Thêm project |
| GET | `/organizations/mine` | ✔ | Tổ chức + role của user |
| POST | `/organizations` | ✔ | Tạo tổ chức (luôn `approved=false`) |
| POST | `/candidates/search` | ✔* | Tìm kiếm ứng viên theo kỹ năng (*cần recruiter của company được duyệt) |
| GET | `/integrations` | ✔ | Trạng thái tích hợp (LinkedIn etc.) |
| POST | `/webhooks/github` | HMAC | Webhook GitHub của app — KHÔNG dùng Bearer |
| GET | `/notifications` | ✔ | Thông báo của user |
| POST | `/notifications/{item_id}/read` | ✔ | Đánh dấu đã đọc |
| GET | `/health/live` | ✖ | Liveness probe |
| GET | `/health/ready` | ✖ | Readiness probe (kiểm tra DB) |

### 3.1 Ví dụ chi tiết các endpoint quan trọng

**`GET /api/v1/users/me`** — response (xác định từ `app/api/v1/users/router.py`,
`user.id` là UUID string):
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "display_name": "Nguyen Van A",
  "email": "a.nguyen@example.com",
  "profile_public": false,
  "recruiter_searchable": false
}
```
`display_name`/`email` lấy từ claim token (name/email) lúc tài khoản được tự tạo,
nên có thể là `null` nếu token không chứa.

**`PATCH /api/v1/users/me`** — body, tất cả field tùy chọn (`ProfilePatch`):
```json
{ "display_name": "Nguyen Van A", "profile_public": true, "recruiter_searchable": false }
```
Response giống hệt `GET /users/me` (chỉ gửi field nào thay đổi field đó).

**`GET /api/v1/skills`** — liệt kê taxonomy, không cần auth, sắp theo `stable_id`:
```json
[
  { "id": "5f1a...", "stable_id": "python", "name": "Python", "parent_id": null },
  { "id": "9c2b...", "stable_id": "python.flask", "name": "Flask", "parent_id": "5f1a..." }
]
```

**`GET /api/v1/skills/me`** — tiến độ kỹ năng của user (`UserSkill` projection):
```json
{
  "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "nodes": [
    { "skill_id": "5f1a...", "stable_id": "python", "name": "Python", "level": 4, "status": "verified" }
  ],
  "edges": [
    { "from": "5f1a...", "to": "9c2b..." }
  ]
}
```
`status` gồm `self_reported` (mặc định) hoặc `verified` (sau khi bằng chứng được
reviewer duyệt); khi PUT progress, `status` reset về `self_reported`.

**`PUT /api/v1/skills/me/progress`** — body (`SkillProgress`):
```json
{ "skill_id": "python", "level": 4, "evidence_id": null }
```
`level` từ 0–10, `skill_id` là `stable_id` của kỹ năng (không phải UUID). Nếu kèm
`evidence_id`, bằng chứng phải thuộc về user (khác → 403 `evidence_owner_required`).
Response: `{"skill_id": "python", "level": 4, "status": "self_reported"}`.

**`GET /api/v1/skill-trees/me`** — snapshot ObjectTree (versioned tree lịch sử):
```json
{
  "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "nodes": [
    {
      "id": "...",
      "path": "/skills/python.flask",
      "value": { "stable_id": "python.flask", "name": "Flask", "level": 4, "status": "self_reported", "evidence_ids": [] },
      "metadata": {}
    }
  ],
  "edges": []
}
```
Mỗi node = result của `ObjectTreeRepository.snapshot()` (`app/integrations/skill_tree/adapter.py`):
fiield `value` là 1 record `SkillNode` (`stable_id`, `name`, `level`, `status`, `evidence_ids`).
`edges` hiện luôn là mảng rỗng (hardcoded trong router).

**`GET /health/live`** → `{"status": "ok"}`. **`GET /health/ready`** → `{"status": "ok"}`
(nếu không kết nối được DB sẽ trả lỗi 5xx).

### 3.2 Các endpoint POST quan trọng — hình dạng body/response

- **`POST /api/v1/evidence/me`** — body `{source (≤50), external_id?, url? (http/https), title (≤300), data {}}` → `{"id", "revision", "status"}` (status ban đầu `self_reported`).
- **`POST /api/v1/evidence/{id}/review`** — body `{organization_id (UUID), status ("verified"|"rejected"|"revoked"), note?}`, yêu cầu user là `reviewer`/`admin` của organization `approved=true` và learner có scope thuộc org đó → `{"id", "status", "evidence_revision"}`. Mọi thay đổi evidence sau verify làm bản verify cũ `invalidated`.
- **`POST /api/v1/projects/me`** — body `{name (≤300), url?, visibility ("private" mặc định hoặc khác), data {}}` → `{"id", "name", "visibility"}`.
- **`POST /api/v1/academic-records/me`** — body `{subject, term, original_grade, grading_scale, credits?}` → `{"id", "status", ...body}`.
- **`POST /api/v1/achievements/me`** — body `{title (≤300), kind (≤40), url?, data {}}` → `{"id", "title", "status"}`.
- **`POST /api/v1/organizations`** — body `{name (≤250), kind}` → `{"id", "approved": false, "role": "member"}`.
- **`POST /api/v1/candidates/search`** — body `{organization_id, match ("all"|"any"), skills: [{skill_id, min_level}], verified_only (true), school_id?, require_shared_project (true), page (≥1), page_size (1–100, mặc định 20)}`. Yêu cầu recruiter của company `approved=true`. Response:
  ```json
  { "items": [{ "id": "...", "display_name": "..." }], "page": 1, "page_size": 20 }
  ```
  Không có trường total — cố ý không trả tổng số để tránh lộ ứng viên ẩn.

---

## 4. Quy ước chung

- **Base path**: `/api/v1` cho mọi route API (riêng `/health/*` không có prefix).
- **Định dạng**: JSON cả hai chiều; request body dùng `Content-Type: application/json`;
  token exchange với Keycloak dùng `application/x-www-form-urlencoded`.
- **Auth**: header `Authorization: Bearer <access_token>`; không có cookie/session.
- **CORS** (`app/main.py`): allow origins lấy từ env `CORS_ORIGINS` (mặc định
  `http://localhost:8081`), `allow_credentials=true`, methods/headers `*`.
  Web frontend phải nằm trong danh sách này.
- **Error shape**: endpoint trả lỗi bằng `HTTPException`, body dạng
  `{"detail": {"code": "<machine_code>", ...}}`. Các mã đã thấy trong code:
  - 401: `invalid_token`, `missing_token`
  - 403: `platform_admin_required`, `evidence_owner_required`, `approved_reviewer_membership_required`, `learner_scope_required`, `recruiter_membership_required`
  - 404: `skill_not_found`, `evidence_not_found`, `skill_progress_not_found`, `not_found`
  - 409: `skill_exists`
  - 422: `invalid_taxonomy_identifier` (cũng là validation Pydantic chuẩn)
  Frontend nên dựa vào `detail.code` để rẽ nhánh, không dựa vào message text.
- **ID**: các resource dùng UUID (string trong JSON). Kỹ năng dùng `stable_id`
  dạng slug như `python`, `python.flask`; `parent_id` của kỹ năng là UUID.
- **Pagination**: chỉ `POST /candidates/search` có phân trang (page/page_size,
  mặc định 20, tối đa 100), trả `items` + `page` + `page_size`, KHÔNG có `total`.
  Các endpoint `/me` trả nguyên danh sách, không phân trang.
- **Trạng thái skill/evidence/achievement/academic-record**: string; mặc định
  `self_reported`, sau verify là `verified`. Evidence còn có `rejected`/`revoked`
  (qua review), và bản verify cũ bị set `invalidated` khi evidence sửa đổi.
- **Webhook GitHub** (`POST /webhooks/github`) là ngoại lệ: không dùng Bearer mà
  ký HMAC-SHA256 toàn bộ raw body với `GITHUB_WEBHOOK_SECRET`, header
  `X-Hub-Signature-256`, `X-GitHub-Delivery`, `X-GitHub-Event`. Frontend web
  thường không cần gọi endpoint này.

---

## 5. Quick-start cho dev frontend

1. **Xem API**: mở `http://localhost:8000/docs` (Swagger UI) hoặc
   `http://localhost:8000/openapi.json`. Nhiều endpoint có nút "Authorize" — dán
   token dạng `Bearer <token>` là có thể gọi thử ngay trong trang docs.
2. **Lấy discovery**: `GET /api/v1/auth/config` (không cần token) → có issuer,
   client_id, audience, scopes, pkce, redirect_uri.
3. **Lấy token bằng tay (local dev, chưa có client) — với điều kiện**:
   - Bạn cần **một Keycloak user** trong realm `arborcursus`. Realm file không seed
     sẵn user nào → tự tạo trên admin console `http://localhost:8080` (login
     `admin`/`admin`), realm `arborcursus`, mục Users → Create.
   - Redirect URI của realm chỉ có `arborcursus://oauth/callback` (scheme native).
     **Nếu bạn gọi bằng Postman/curl/trình duyệt, bạn phải đăng ký thêm redirect
     URI phù hợp** trong Keycloak admin (Clients → `arborcursus-mobile` → Valid
     redirect URIs), ví dụ `https://oauth.pstmn.io/v1/callback` (Postman) hoặc
     `http://localhost:8081/callback`. Nếu bạn không thêm được (không có quyền
     admin Keycloak), nhờ team backend, vì nó là thao tác cấu hình Keycloak chứ
     không phải thay đổi mã nguồn API.
   - Chuỗi bước đầy đủ theo đúng mục 2.2: tạo `code_verifier` + `code_challenge`,
     mở authorization_endpoint trên trình duyệt với client_id `arborcursus-mobile`,
     đăng nhập, bắt `code`, POST token_endpoint đổi `code` + `code_verifier`.
4. **Kiểm tra token**: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/users/me`
   — nếu token đúng, Keycloak trả user thật vừa tạo (và lần này tự tạo `User`
   trong DB). Lỗi `invalid_token`/`missing_token` = vấn đề token; `403` = thiếu
   quyền tính năng (reviewer/recruiter/platform_admin).
5. **React Native**: không cần thủ công, dùng AppAuth/keycloak-js như mô tả 2.2,
   xử lý deep link `arborcursus://oauth/callback`.
6. **SPA web**: dừng lại, đọc lại cảnh báo 2.3 — chưa đăng nhập được cho tới khi
   backend thêm web client OIDC + redirect URI + CORS.

---

## 6. Ghi chú giới hạn MVP (thẳng thắn, để tránh giả định)

- **Không có web/SPA client trong Keycloak** — xem 2.3.
- Không có endpoint GET danh sách evidence — chỉ tạo (`POST /evidence/me`), sửa
  (`PATCH /evidence/{id}`), review (`POST /evidence/{id}/review`). Muốn xem bằng
  chứng của user cần thêm endpoint (chưa có trong code).
- Không có endpoint để tạo ShareGrant / Membership / approve organization —
  các thứ này phục vụ các bản verify/search nhưng **chưa có route API tương ứng**.
- Không có xóa/sửa cho project, academic-record, evidence; không có upload file.
- Không có Redis: worker dùng bảng `jobs` trong PostgreSQL.
- Không có refresh-token rotation/lifetime production nào được cấu hình trong
  realm file — là việc của operator Keycloak khi deploy. Realm local chỉ để smoke-test.

Nguồn đối chiếu: `app/` (main, core/config, core/security, api/v1/*), `docs/mobile-auth.md`,
`docs/architecture.md`, `docs/integrations.md`, `compose.yaml`, `keycloak/arborcursus-realm.json`,
`openapi.json` và OIDC discovery thực tế của Keycloak đang chạy.