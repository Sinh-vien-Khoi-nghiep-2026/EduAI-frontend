import { expect, test } from "bun:test";
import { connectSession } from "./session-transaction";

const user = { id: "u", display_name: null, email: null, profile_public: false, recruiter_searchable: false };

test("session connection verifies before activating the trimmed token", async () => {
  let active = false;
  await expect(connectSession("   ", async () => user, () => { active = true; })).rejects.toThrow("Paste an access token");
  expect(active).toBeFalse();
  await connectSession(" token ", async value => { expect(value).toBe("token"); return user; }, (token, current) => { active = token === "token" && current === user; });
  expect(active).toBeTrue();
});

test("rejected replacement token cannot replace an existing session", async () => {
  let persisted = "current-token";
  const activate = (token: string) => { persisted = token; };
  for (const failure of [new Error("unauthorized"), new Error("forbidden"), new Error("server error"), new TypeError("network error")]) {
    await expect(connectSession("candidate-token", async () => { throw failure; }, activate)).rejects.toBe(failure);
    expect(persisted).toBe("current-token");
  }
});
