import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const ADMIN = { user: "admin@local.dev", password: "admin" };
const STUDENT = { user: "student@local.dev", password: "student" };
const STUDENT2 = { user: "student2@local.dev", password: "student2" };
async function signIn(page: Page, credentials: { user: string; password: string }) {
  await page.goto("/connect");
  await page.getByLabel("Email or username").fill(credentials.user);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(url => !url.pathname.startsWith("/connect"), { timeout: 15_000 });
}

async function getAccessToken(request: APIRequestContext, credentials: { user: string; password: string }): Promise<string> {
  const tokenResponse = await request.post(
    "http://127.0.0.1:8099/realms/arborcursus/protocol/openid-connect/token",
    {
      form: {
        grant_type: "password",
        client_id: "arborcursus-web",
        username: credentials.user,
        password: credentials.password,
      },
    },
  );
  expect(tokenResponse.ok()).toBe(true);
  const data = (await tokenResponse.json()) as { access_token: string };
  return data.access_token;
}

test("student creates evidence and sees it in My Evidence", async ({ page, context, request }) => {
  // Step 1: Obtain a student token via the IdP password grant.
  const studentToken = await getAccessToken(request, STUDENT);
  expect(studentToken).toBeTruthy();

  // Step 2: Sign in and navigate to /evidence.
  await signIn(page, STUDENT);
  await page.goto("/evidence");
  await expect(page.getByRole("heading", { name: "My Evidence" })).toBeVisible();

  // Try granting clipboard permissions; headless chromium may allow or ignore.
  try {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  } catch {
    // context.grantPermissions might not support clipboard in all headless configs.
  }

  // Step 3: Open dialog, fill Title with unique name and Source github, submit.
  const title = `E2E my-evidence ${Date.now()}`;
  await page.getByRole("button", { name: "Add evidence" }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByLabel("Source").fill("github");
  await dialog.getByRole("button", { name: "Add evidence" }).click();

  // Step 4: Assert dialog closes and success notice appears.
  await expect(dialog).toBeHidden();
  const notice = page.locator(".notice.evidence-success");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("Evidence saved");

  // Step 5: Assert new title appears in My Evidence table WITHOUT reloading.
  const evidenceRow = page.getByRole("row").filter({ hasText: title });
  await expect(evidenceRow).toBeVisible();

  // Step 6: Assert row shows full UUID in ID column.
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const idCell = evidenceRow.locator("td").nth(1);
  const codeText = await idCell.locator("code").innerText();
  expect(codeText.trim()).toMatch(uuidRegex);

  // Step 7: page.reload(), wait for table, assert same title and same ID are still present.
  await page.reload();
  await expect(page.getByRole("heading", { name: "My Evidence" })).toBeVisible();
  const reloadedRow = page.getByRole("row").filter({ hasText: title });
  await expect(reloadedRow).toBeVisible();
  const reloadedId = await reloadedRow.locator("td").nth(1).locator("code").innerText();
  expect(reloadedId.trim()).toBe(codeText.trim());

  // Step 8: Click Copy button and assert visible confirmation ("Copied") or clipboard error notice.
  // In headless environments, navigator.clipboard can fail if permissions are denied.
  const copyButton = reloadedRow.getByRole("button", { name: new RegExp(`Copy evidence ID ${codeText.trim()}`, "i") });
  await copyButton.click();

  const copiedConfirmation = reloadedRow.getByText("Copied");
  const copyErrorNotice = page.locator(".form-error").filter({ hasText: "Clipboard copy failed" });
  await expect(copiedConfirmation.or(copyErrorNotice)).toBeVisible();
});

test("another student cannot see the first student's evidence", async ({ page, request }) => {
  // Step 1: Create evidence for the student via the API, capture its id and title.
  const studentToken = await getAccessToken(request, STUDENT);
  const title = `E2E isolation-evidence ${Date.now()}`;
  const createRes = await request.post("http://127.0.0.1:8000/api/v1/evidence/me", {
    headers: {
      Authorization: `Bearer ${studentToken}`,
      "Content-Type": "application/json",
    },
    data: {
      title,
      source: "github",
    },
  });
  expect(createRes.ok()).toBe(true);
  const createdEvidence = (await createRes.json()) as { id: string };
  const evidenceId = createdEvidence.id;
  expect(evidenceId).toBeTruthy();

  // Step 2: Sign in as student2 and page.goto("/evidence").
  await signIn(page, STUDENT2);
  await page.goto("/evidence");
  await expect(page.getByRole("heading", { name: "My Evidence" })).toBeVisible();

  // Step 3: Assert that the first student's title is NOT present in the page.
  await expect(page.getByText(title)).toHaveCount(0);

  // Step 4: Assert at API level: GET /api/v1/evidence/me with student2 token returns no item with that id or title.
  const student2Token = await getAccessToken(request, STUDENT2);
  const student2EvidenceRes = await request.get("http://127.0.0.1:8000/api/v1/evidence/me", {
    headers: {
      Authorization: `Bearer ${student2Token}`,
    },
  });
  expect(student2EvidenceRes.ok()).toBe(true);
  const student2EvidenceList = (await student2EvidenceRes.json()) as Array<{ id: string; title: string }>;
  const student2Found = student2EvidenceList.some(item => item.id === evidenceId || item.title === title);
  expect(student2Found).toBe(false);

  // Step 5: Assert reverse isolation directly: student1's list DOES contain it.
  const studentEvidenceRes = await request.get("http://127.0.0.1:8000/api/v1/evidence/me", {
    headers: {
      Authorization: `Bearer ${studentToken}`,
    },
  });
  expect(studentEvidenceRes.ok()).toBe(true);
  const studentEvidenceList = (await studentEvidenceRes.json()) as Array<{ id: string; title: string }>;
  const studentFound = studentEvidenceList.some(item => item.id === evidenceId && item.title === title);
  expect(studentFound).toBe(true);

  // Step 6: Also assert an unrelated account (admin) does not see it either.
  const adminToken = await getAccessToken(request, ADMIN);
  const adminEvidenceRes = await request.get("http://127.0.0.1:8000/api/v1/evidence/me", {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  expect(adminEvidenceRes.ok()).toBe(true);
  const adminEvidenceList = (await adminEvidenceRes.json()) as Array<{ id: string; title: string }>;
  const adminFound = adminEvidenceList.some(item => item.id === evidenceId || item.title === title);
  expect(adminFound).toBe(false);
});

test("editing only the title preserves stored metadata and bumps the revision", async ({ page, request }) => {
  // Regression: the edit dialog used to PATCH the whole record, wiping the
  // `data` object and `external_id` the learner never saw in the form.
  const studentToken = await getAccessToken(request, STUDENT);
  const title = `E2E edit-preserve ${Date.now()}`;
  const metadata = { repo: "acme/widgets", stars: 42 };
  // evidence is unique on (owner_id, source, external_id); a fixed value would
  // collide on the second run of this suite.
  const externalId = `acme/widgets#${Date.now()}`;
  const created = await request.post("http://127.0.0.1:8000/api/v1/evidence/me", {
    headers: { Authorization: `Bearer ${studentToken}`, "Content-Type": "application/json" },
    data: { title, source: "github", external_id: externalId, url: "https://example.com/acme", data: metadata },
  });
  expect(created.ok()).toBe(true);
  const evidence = (await created.json()) as { id: string; revision: number };

  await signIn(page, STUDENT);
  await page.goto("/evidence");
  const row = page.getByRole("row").filter({ hasText: title });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Edit" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // The id is pinned to the row this dialog was opened from; a retyped id
  // would PATCH a different record the user never opened.
  const idField = dialog.getByLabel("Evidence ID");
  await expect(idField).toHaveAttribute("readonly", "");
  await expect(idField).toHaveValue(evidence.id);
  const editedTitle = `${title} (edited)`;
  await dialog.getByLabel("Title").fill(editedTitle);
  await dialog.getByRole("button", { name: "Update evidence" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("row").filter({ hasText: editedTitle })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: editedTitle })).toBeVisible();

  const listed = await request.get("http://127.0.0.1:8000/api/v1/evidence/me", {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const items = (await listed.json()) as Array<{
    id: string; title: string; revision: number; external_id: string | null; data: Record<string, unknown>;
  }>;
  const after = items.find(item => item.id === evidence.id);
  expect(after).toBeTruthy();
  expect(after!.title).toBe(editedTitle);
  expect(after!.external_id).toBe(externalId);
  expect(after!.data).toEqual(metadata);
  expect(after!.revision).toBe(evidence.revision + 1);

  // Manual-ID mode loads nothing, so the dialog must not send the `data` key at
  // all: a full-record PATCH used to write `data: {}` over metadata the learner
  // never saw. `external_id` and `url` ARE fields the dialog shows, so they are
  // applied (an empty box clears them) — that part is intended.
  const manualTitle = `E2E edit-manual ${Date.now()}`;
  const manualExternalId = `acme/manual#${Date.now()}`;
  const manualCreated = await request.post("http://127.0.0.1:8000/api/v1/evidence/me", {
    headers: { Authorization: `Bearer ${studentToken}`, "Content-Type": "application/json" },
    data: { title: manualTitle, source: "github", external_id: manualExternalId, data: metadata },
  });
  expect(manualCreated.ok()).toBe(true);
  const manualEvidence = (await manualCreated.json()) as { id: string; revision: number };

  await page.getByRole("button", { name: "Update by ID" }).click();
  const manualDialog = page.getByRole("dialog");
  await expect(manualDialog).toBeVisible();
  await manualDialog.getByLabel("Evidence ID").fill(manualEvidence.id);
  await manualDialog.getByLabel("Title").fill(`${manualTitle} (edited)`);
  await manualDialog.getByLabel("Source").fill("github");
  await manualDialog.getByRole("button", { name: "Update evidence" }).click();
  await expect(manualDialog).toBeHidden();

  const listedAgain = await request.get("http://127.0.0.1:8000/api/v1/evidence/me", {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const manualAfter = ((await listedAgain.json()) as Array<{
    id: string; title: string; revision: number; external_id: string | null; data: Record<string, unknown>;
  }>).find(item => item.id === manualEvidence.id);
  expect(manualAfter).toBeTruthy();
  expect(manualAfter!.title).toBe(`${manualTitle} (edited)`);
  expect(manualAfter!.data).toEqual(metadata);
  expect(manualAfter!.revision).toBe(manualEvidence.revision + 1);
});
