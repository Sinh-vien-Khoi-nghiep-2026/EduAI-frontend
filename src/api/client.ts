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

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; token?: string | null };

const baseUrl = (process.env.BUN_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
function normalizeError(status: number, payload: unknown): ApiError {
  const detail = typeof payload === "object" && payload !== null ? (payload as { detail?: unknown }).detail : undefined;
  if (Array.isArray(detail)) {
    const fieldErrors: FieldErrors = {};
    for (const issue of detail) {
      if (typeof issue === "object" && issue !== null) {
        const item = issue as { loc?: unknown; msg?: unknown };
        const key = Array.isArray(item.loc) ? String(item.loc.at(-1) ?? "form") : "form";
        fieldErrors[key] = typeof item.msg === "string" ? item.msg : "Invalid value";
      }
    }
    return new ApiError(status, "Please correct the highlighted fields.", "validation_error", fieldErrors);
  }
  if (typeof detail === "object" && detail !== null) {
    const record = detail as { code?: unknown; message?: unknown };
    const code = typeof record.code === "string" ? record.code : undefined;
    const message = typeof record.message === "string" ? record.message : code?.replaceAll("_", " ") ?? "Request failed";
    return new ApiError(status, message, code);
  }
  if (typeof detail === "string") return new ApiError(status, detail);
  return new ApiError(status, status === 401 ? "Your session is no longer valid." : "The request could not be completed.");
}

export async function request<T>(path: string, { body, token, headers, ...init }: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    ...init,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("application/json") ? await response.json() : undefined;
  if (!response.ok) throw normalizeError(response.status, payload);
  return payload as T;
}

export const apiOrigin = baseUrl;
