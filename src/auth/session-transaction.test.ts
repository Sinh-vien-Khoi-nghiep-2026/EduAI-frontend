import { expect, test } from "bun:test";
import { connectSession } from "./session-transaction";

test("session connection verifies before activating the trimmed token", async () => {
  const user = { id: "u", display_name: null, email: null, profile_public: false, recruiter_searchable: false };
  let active = false;
  await expect(connectSession("   ", async () => user, () => { active = true; })).rejects.toThrow("Paste an access token");
  expect(active).toBeFalse();
  await connectSession(" token ", async value => { expect(value).toBe("token"); return user; }, (token, current) => { active = token === "token" && current === user; });
  expect(active).toBeTrue();
});
