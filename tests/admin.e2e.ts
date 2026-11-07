/**
 * Admin console verification against the locally running stack.
 *
 * Prereqs (see docs/admin-console.md): API on :8000, dev IdP on :8099,
 * frontend on :8081. Run: bun run test:e2e
 */
import { expect, test, type Page } from "@playwright/test";

const SHOTS = "tests/screenshots";
const ADMIN = { user: "admin@local.dev", password: "admin" };
const REVIEWER = { user: "reviewer@local.dev", password: "reviewer" };
const STUDENT = { user: "student@local.dev", password: "student" };

async function signIn(page: Page, credentials: { user: string; password: string }) {
  await page.goto("/connect");
  await page.getByLabel("Email or username").fill(credentials.user);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(url => !url.pathname.startsWith("/connect"), { timeout: 15_000 });
}

/** Fail on real horizontal overflow, the most common responsive defect. */
async function expectNoHorizontalOverflow(page: Page) {
  // Off-canvas drawers are translated out of view on purpose; that is not
  // overflow, so measure the scrollable width rather than element rects.
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const width = root.clientWidth;
    return {
      scrollWidth: root.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      width,
    };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width + 1);
  expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.width + 1);
}

test("platform admin sees the console and can author taxonomy", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, ADMIN);

  await page.getByRole("link", { name: "Admin console" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Console overview" })).toBeVisible();
  await expect(page.getByText("Platform administrator")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/overview-1440.png`, fullPage: true });

  await page.getByRole("link", { name: "Skill taxonomy" }).click();
  await expect(page.getByRole("heading", { name: "Skill taxonomy" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/taxonomy-1440.png`, fullPage: true });

  // Client-side validation fires before any request.
  await page.getByRole("button", { name: /new skill/i }).click();
  await page.getByLabel("Stable ID").fill("Bad ID!");
  await page.getByLabel("Display name").fill("Invalid example");
  await page.getByRole("button", { name: /create skill/i }).click();
  await expect(page.getByText(/Stable ID: Use lowercase letters/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/taxonomy-validation-1440.png` });

  // A valid submission reaches the API and refreshes the list.
  const suffix = Date.now().toString(36);
  await page.getByLabel("Stable ID").fill(`e2e.skill.${suffix}`);
  await page.getByLabel("Display name").fill(`E2E skill ${suffix}`);
  await page.getByRole("button", { name: /create skill/i }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("searchbox", { name: /filter taxonomy/i }).fill(suffix);
  await expect(page.getByRole("cell", { name: `e2e.skill.${suffix}` })).toBeVisible();
});

test("duplicate stable ID surfaces the backend 409", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signIn(page, ADMIN);
  await page.goto("/admin/taxonomy");
  await page.getByRole("button", { name: /new skill/i }).click();
  await page.getByLabel("Stable ID").fill("typescript");
  await page.getByLabel("Display name").fill("Duplicate TypeScript");
  await page.getByRole("button", { name: /create skill/i }).click();
  await expect(page.getByText(/skill exists/i)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/taxonomy-conflict-1280.png` });
});

test("reviewer reaches review console without platform admin", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signIn(page, REVIEWER);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Console overview" })).toBeVisible();
  await expect(page.getByText("Reviewer", { exact: true })).toBeVisible();

  // No platform capability -> taxonomy section is absent and the create action is hidden.
  await expect(page.getByRole("link", { name: "Skill taxonomy" })).toHaveCount(0);
  await page.goto("/admin/taxonomy");
  await expect(page.getByRole("button", { name: /new skill/i })).toHaveCount(0);
  await expect(page.getByText("Read only")).toBeVisible();

  await page.goto("/admin/reviews");
  await expect(page.getByRole("heading", { name: "Evidence review" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/reviews-reviewer-1280.png`, fullPage: true });
});

test("ordinary user cannot reach any admin route directly", async ({ page }) => {
  await signIn(page, STUDENT);
  for (const path of ["/admin", "/admin/taxonomy", "/admin/reviews", "/admin/access"]) {
    await page.goto(path);
    await expect(page.getByText(/Restricted/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Console overview" })).toHaveCount(0);
    await expect(page.getByRole("table")).toHaveCount(0);
  }
  await expect(page.getByRole("link", { name: "Admin console" })).toHaveCount(0);
});

test("unauthenticated direct navigation redirects to sign-in", async ({ page }) => {
  await page.goto("/admin/taxonomy");
  await expect(page).toHaveURL(/\/connect$/);
  await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();
});

test("mobile navigation and layout hold up", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, ADMIN);
  await page.goto("/admin");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${SHOTS}/overview-390.png`, fullPage: true });

  await expect(page.getByRole("navigation", { name: "Admin navigation" })).toBeHidden();
  await page.getByRole("button", { name: /open admin navigation/i }).click();
  await expect(page.getByRole("navigation", { name: "Admin navigation" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/overview-390-nav.png` });
  await page.getByRole("link", { name: "Skill taxonomy" }).click();
  await expect(page.getByRole("heading", { name: "Skill taxonomy" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${SHOTS}/taxonomy-390.png`, fullPage: true });

  await page.goto("/admin/reviews");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${SHOTS}/reviews-390.png`, fullPage: true });
});

test("responsive sweep across all required viewports", async ({ page }) => {
  const viewports = [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
  ];
  await page.setViewportSize({ width: 1024, height: 768 });
  await signIn(page, ADMIN);
  for (const size of viewports) {
    await page.setViewportSize(size);
    for (const [path, name] of [
      ["/admin", "overview"],
      ["/admin/taxonomy", "taxonomy"],
      ["/admin/reviews", "reviews"],
      ["/admin/access", "access"],
    ] as const) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: `${SHOTS}/${name}-${size.width}.png`,
        fullPage: true,
      });
    }
  }
});

test("workspace routes still work after admin addition", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signIn(page, STUDENT);
  for (const [path, heading] of [
    ["/", "Welcome back"],
    ["/skills", "Skills"],
    ["/evidence", "Evidence"],
    ["/organizations", "Profile and organizations"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading, { timeout: 10_000 });
  }
});

test("reviewer records a real decision and sees the server receipt", async ({ page, request }) => {
  // Real integration: create evidence through the API as the learner, then
  // review it through the console. No fixture data, no mocked responses.
  const tokenResponse = await request.post(
    "http://127.0.0.1:8099/realms/arborcursus/protocol/openid-connect/token",
    { form: { grant_type: "password", client_id: "arborcursus-web", username: STUDENT.user, password: STUDENT.password } },
  );
  expect.soft(tokenResponse.ok()).toBe(true);
  const studentToken = ((await tokenResponse.json()) as { access_token: string }).access_token;
  const evidenceResponse = await request.post("http://127.0.0.1:8000/api/v1/evidence/me", {
    headers: { Authorization: `Bearer ${studentToken}` },
    data: { source: "github", title: `E2E evidence ${Date.now()}`, data: {} },
  });
  expect.soft(evidenceResponse.ok()).toBe(true);
  const evidence = (await evidenceResponse.json()) as { id: string; revision: number };

  // A sibling test deliberately puts every organization back in the pending
  // state; re-approve the reviewer's organization so this test owns its own
  // precondition instead of depending on run order.
  const adminTokenResponse = await request.post(
    "http://127.0.0.1:8099/realms/arborcursus/protocol/openid-connect/token",
    { form: { grant_type: "password", client_id: "arborcursus-web", username: ADMIN.user, password: ADMIN.password } },
  );
  const adminToken = (await adminTokenResponse.json() as { access_token: string }).access_token;
  const pending = await request.get(
    "http://127.0.0.1:8000/api/v1/admin/organizations?page_size=100",
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  const orgList = await pending.json() as { items: { id: string; name: string }[] };
  const reviewOrg = orgList.items.find(org => org.name === "Hanoi Polytechnic");
  expect.soft(reviewOrg).toBeDefined();
  await request.patch(`http://127.0.0.1:8000/api/v1/admin/organizations/${reviewOrg!.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { approved: true },
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await signIn(page, REVIEWER);
  await page.goto("/admin/reviews");
  await page.getByLabel("Evidence ID").fill(evidence.id);
  await page.getByLabel("Organization").selectOption({ label: "Hanoi Polytechnic · reviewer" });
  await page.getByRole("radio", { name: /verified/i }).check();
  await page.getByLabel("Note").fill("Reviewed during console verification.");
  await page.getByRole("button", { name: /submit decision/i }).click();

  const receipt = page.locator(".admin-receipt");
  await expect(receipt).toBeVisible();
  await expect(receipt).toContainText(
    `Decision recorded for evidence revision ${evidence.revision}.`,
  );
  await expect(receipt.getByText("verified", { exact: true })).toBeVisible();
  // Sticky chrome repeats mid-page in tall captures; reset scroll first.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${SHOTS}/reviews-receipt-1280.png`, fullPage: true });
  // Persistence is asserted against PostgreSQL by scripts/verify-review.sh.
});

test("keyboard: dialog traps focus, Escape closes, form is reachable by tab", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signIn(page, ADMIN);
  await page.goto("/admin/taxonomy");

  const trigger = page.getByRole("button", { name: /new skill/i });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "New taxonomy skill" });
  await expect(dialog).toBeVisible();
  // Focus moves into the dialog instead of staying on the page behind it.
  await expect(page.locator(":focus")).toHaveJSProperty("tagName", "INPUT");

  // Tab cycles inside the dialog and never escapes the modal.
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  // Focus returns to the control that opened the dialog.
  await expect(trigger).toBeFocused();
});

test("platform admin administers accounts, organizations and evidence", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // Make the approval assertion independent of whatever a previous run left
  // behind: put every organization back in the pending state through the API.
  const tokenResponse = await request.post(
    "http://127.0.0.1:8099/realms/arborcursus/protocol/openid-connect/token",
    { form: { grant_type: "password", client_id: "arborcursus-web", username: ADMIN.user, password: ADMIN.password } },
  );
  const adminToken = (await tokenResponse.json() as { access_token: string }).access_token;
  const listed = await request.get("http://127.0.0.1:8000/api/v1/admin/organizations?page_size=100", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const organizations = await listed.json() as { items: { id: string; name: string; approved: boolean }[] };
  for (const org of organizations.items.filter(item => item.approved)) {
    await request.patch(`http://127.0.0.1:8000/api/v1/admin/organizations/${org.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { approved: false },
    });
  }

  await signIn(page, ADMIN);

  // Accounts: real rows from GET /admin/users, search narrows them.
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
  await expect(page.getByRole("cell", { name: /reviewer@local\.dev/ })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search accounts" }).fill("student");
  await expect(page.getByRole("cell", { name: /student@local\.dev/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: /reviewer@local\.dev/ })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/users-1440.png`, fullPage: true });

  // Organizations: approving a pending organization persists.
  await page.goto("/admin/organizations");
  const pendingRow = page.getByRole("row", { name: /Acme School/ });
  await expect(pendingRow).toBeVisible();
  await pendingRow.getByRole("button", { name: "Approve" }).click();
  // Approval is persisted, so the row leaves the Pending tab.
  await expect(page.getByRole("row", { name: /Acme School/ })).toHaveCount(0);
  await page.getByRole("button", { name: "approved", exact: true }).click();
  await expect(
    page.getByRole("row", { name: /Acme School/ }).getByText("approved", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/organizations-1440.png`, fullPage: true });

  // Membership is staffed from the same screen.
  await page.getByRole("row", { name: /Acme School/ }).getByRole("button", { name: "Manage" }).click();
  await expect(page.getByRole("heading", { name: /Members of Acme School/ })).toBeVisible();
  const addAccount = page.getByRole("combobox", { name: "Add account" });
  const addedUserId = await addAccount.locator("option").nth(1).getAttribute("value");
  await addAccount.selectOption({ index: 1 });
  await page.getByRole("combobox", { name: "Role", exact: true }).selectOption("reviewer");
  await page.getByRole("button", { name: /Add member/i }).click();
  await expect(page.getByRole("combobox", { name: /Role for/ }).last()).toHaveValue("reviewer");
  await page.screenshot({ path: `${SHOTS}/organizations-members-1440.png`, fullPage: true });

  // Clean up the membership this test just created. Without this, every run
  // permanently grants another account reviewer rights in Acme School and the
  // evidence assertion below stops holding.
  await request.delete(
    `http://127.0.0.1:8000/api/v1/admin/organizations/${organizations.items.find(org => org.name === "Acme School")!.id}/members/${addedUserId}`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );

  // Evidence queue lists submissions and deep-links into a decision.
  await page.goto("/admin/evidence");
  await expect(page.getByRole("heading", { name: "Evidence" })).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/evidence-1440.png`, fullPage: true });
  // This admin holds no reviewer membership, so the action is not offered.
  await expect(page.getByRole("link", { name: /Review/ })).toHaveCount(0);
  await expect(page.getByText("no review scope").first()).toBeVisible();
});

test("reviewer is denied every platform-administration route", async ({ page }) => {
  await signIn(page, REVIEWER);
  for (const path of ["/admin/users", "/admin/organizations", "/admin/evidence"]) {
    await page.goto(path);
    await expect(page.getByText(/Restricted/).first()).toBeVisible();
    await expect(page.locator("table")).toHaveCount(0);
  }
  // The reviewer keeps only the capability they actually hold.
  await page.goto("/admin");
  await expect(page.getByRole("link", { name: "Accounts", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Organizations", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Review decisions" })).toBeVisible();
});

test("account edit persists boolean flags and shows organization context", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  const tokenResponse = await request.post(
    "http://127.0.0.1:8099/realms/arborcursus/protocol/openid-connect/token",
    { form: { grant_type: "password", client_id: "arborcursus-web", username: ADMIN.user, password: ADMIN.password } },
  );
  const adminToken = (await tokenResponse.json() as { access_token: string }).access_token;

  await signIn(page, ADMIN);
  await page.goto("/admin/users");
  await page.getByRole("searchbox", { name: "Search accounts" }).fill("student");
  await page.getByRole("row", { name: /student@local\.dev/ }).getByRole("button", { name: "Edit name" }).click();

  // The editor shows which organization grants each role, because the flat
  // `roles` column on the list cannot say that.
  await expect(page.getByRole("heading", { name: "Organization roles" })).toBeVisible();
  await expect(page.getByText("Acme School")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/users-edit-1440.png`, fullPage: true });

  const searchable = page.getByLabel("Recruiter searchable");
  await searchable.check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Account settings" })).toHaveCount(0);

  // Persistence is checked against the API, not against the refreshed table.
  const listed = await request.get("http://127.0.0.1:8000/api/v1/admin/users?q=student", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const body = await listed.json() as {
    items: { id: string; recruiter_searchable: boolean }[];
  };
  const account = body.items[0]!;
  expect.soft(account.recruiter_searchable).toBe(true);

  // An explicit null for a NOT NULL flag is refused by the API with 422, never 500.
  const userId = account.id;
  const nullPatch = await request.patch(`http://127.0.0.1:8000/api/v1/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { profile_public: null },
  });
  expect.soft(nullPatch.status()).toBe(422);

  // Restore the flag so the fixture is not left mutated.
  await request.patch(`http://127.0.0.1:8000/api/v1/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { recruiter_searchable: false },
  });
});
