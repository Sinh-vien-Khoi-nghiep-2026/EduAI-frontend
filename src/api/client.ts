export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
  }
}

export class ApiConfigurationError extends Error {}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; token?: string | null };
type UnauthorizedHandler = (token: string) => void;
let unauthorizedHandler: UnauthorizedHandler | undefined;
let configuredBaseUrl = globalThis.__ARBORCURSUS_CONFIG__?.apiBaseUrl?.trim().replace(/\/$/, "") ?? "";

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
  return () => { if (unauthorizedHandler === handler) unauthorizedHandler = undefined; };
}

export function configureApiOrigin(value: string | undefined) {
  configuredBaseUrl = value?.trim().replace(/\/$/, "") ?? "";
}

function apiUrl(path: string) {
  if (!configuredBaseUrl) throw new ApiConfigurationError("API configuration is missing. Set BUN_PUBLIC_API_BASE_URL before starting or building the frontend.");
  return `${configuredBaseUrl}/api/v1${path}`;
}

function normalizeError(status: number, payload: unknown): ApiError {
  const detail = typeof payload === "object" && payload !== null && "detail" in payload ? payload.detail : undefined;
  if (Array.isArray(detail)) {
    const fieldErrors: FieldErrors = {};
    for (const issue of detail) {
      if (typeof issue !== "object" || issue === null) continue;
      const loc = "loc" in issue ? issue.loc : undefined;
      const message = "msg" in issue ? issue.msg : undefined;
      const key = Array.isArray(loc) ? String(loc.at(-1) ?? "form") : "form";
      fieldErrors[key] = typeof message === "string" ? message : "Invalid value";
    }
    return new ApiError(status, "Please correct the highlighted fields.", "validation_error", fieldErrors);
  }
  if (typeof detail === "object" && detail !== null) {
    const code = "code" in detail && typeof detail.code === "string" ? detail.code : undefined;
    const message = "message" in detail && typeof detail.message === "string" ? detail.message : code?.replaceAll("_", " ") ?? "Request failed";
    return new ApiError(status, message, code);
  }
  if (typeof detail === "string") return new ApiError(status, detail);
  return new ApiError(status, status === 401 ? "Your session is no longer valid." : "The request could not be completed.");
}

export function shouldRetryQuery(failureCount: number, error: unknown) {
  return !(error instanceof ApiError && error.status === 401) && failureCount < 1;
}

export async function request<T>(path: string, { body, token, headers, ...init }: RequestOptions = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  if (response.status === 401 && token) queueMicrotask(() => unauthorizedHandler?.(token));
  const contentType = response.headers.get("content-type") ?? "";
  let payload: unknown;
  if (contentType.includes("application/json")) {
    try { payload = await response.json(); }
    catch { throw new ApiError(response.status, "The server returned an invalid response."); }
  }
  if (!response.ok) throw normalizeError(response.status, payload);
  return payload as T;
}

export function apiOrigin() { return configuredBaseUrl; }
