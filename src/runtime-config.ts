export type RuntimeConfig = { apiBaseUrl?: string };

export function runtimeConfig(): RuntimeConfig {
  const apiBaseUrl = process.env.BUN_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
  return apiBaseUrl ? { apiBaseUrl } : {};
}
