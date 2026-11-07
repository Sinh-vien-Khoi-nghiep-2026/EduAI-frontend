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
