import { expect, test } from "bun:test";
import { ApiError } from "@/api/client";
import { shouldEndSession } from "./session";

test("restored-session bootstrap ends only on an unauthorized API response", () => {
  expect(shouldEndSession(new ApiError(401, "expired"))).toBeTrue();
  expect(shouldEndSession(new ApiError(403, "forbidden"))).toBeFalse();
  expect(shouldEndSession(new ApiError(500, "server error"))).toBeFalse();
  expect(shouldEndSession(new TypeError("network error"))).toBeFalse();
});
