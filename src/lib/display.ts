export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleString();
}

function formatValue(value: unknown, depth = 0): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.slice(0, 4).map(item => formatValue(item, depth + 1)).join(", ");
  if (typeof value === "object") {
    if (depth > 0) return "…";
    return Object.entries(value).slice(0, 4).map(([key, item]) => `${key}: ${formatValue(item, depth + 1)}`).join(", ");
  }
  return "";
}

export function notificationText(body: Record<string, unknown>): string {
  const value = typeof body.message === "string" ? body.message : typeof body.title === "string" ? body.title : Object.entries(body).map(([key, item]) => `${key}: ${formatValue(item)}`).join(" · ");
  return value ? `${value.slice(0, 280)}${value.length > 280 ? "…" : ""}` : "Notification received.";
}

export function safeExternalUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}
