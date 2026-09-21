import { expect, test } from "bun:test";
import { request } from "./client";

test("request normalizes FastAPI field validation errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ detail: [{ loc: ["body", "level"], msg: "Input should be less than or equal to 10" }] }), { status: 422, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
  try {
    await expect(request("/skills/me/progress", { method: "PUT", body: { skill_id: "typescript", level: 11 } })).rejects.toMatchObject({ status: 422, code: "validation_error", fieldErrors: { level: "Input should be less than or equal to 10" } });
  } finally { globalThis.fetch = originalFetch; }
});
