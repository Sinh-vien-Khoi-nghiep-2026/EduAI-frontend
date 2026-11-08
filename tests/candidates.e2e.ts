/**
 * Recruiter candidate search (Scenario B) against the locally running stack.
 *
 * Prereqs: API :8000, dev IdP :8099 (please include recruiter@local.dev),
 * frontend :8081. The spec provisions its own database state through the API,
 * so repeated runs on a dirty database still pass.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://127.0.0.1:8000/api/v1";
const ADMIN = { user: "admin@local.dev", password: "admin" };
const RECRUITER = { user: "recruiter@local.dev", password: "recruiter" };
const STUDENT = { user: "student@local.dev", password: "student" };
const COMPANY_NAME = "Globex Corp";
const SCHOOL_NAME = "Hanoi Polytechnic";
const STUDENT_NAME = "Sam Student";

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

async function setConsent(request: APIRequestContext, studentToken: string, organizationId: string, active: boolean) {
  const response = await request.put(`${API}/share-grants/me`, {
    headers: { Authorization: `Bearer ${studentToken}` },
    data: { organization_id: organizationId, scope: "recruiter_search", active },
  });
  expect(response.ok()).toBe(true);
}

test("recruiter search is scoped to the chosen company, school and consent", async ({ page, request }) => {
  const adminToken = await getAccessToken(request, ADMIN);
  const studentToken = await getAccessToken(request, STUDENT);
  const recruiterToken = await getAccessToken(request, RECRUITER);
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const studentHeaders = { Authorization: `Bearer ${studentToken}` };
  const recruiterHeaders = { Authorization: `Bearer ${recruiterToken}` };

  // First authenticated request provisions the recruiter's account row.
  const provisioned = await request.get(`${API}/users/me`, { headers: recruiterHeaders });
  expect(provisioned.ok()).toBe(true);

  // Scopes come from the admin API so the spec never hardcodes stale UUIDs.
  const orgsResponse = await request.get(`${API}/admin/organizations?page_size=100`, { headers: adminHeaders });
  expect(orgsResponse.ok()).toBe(true);
  const organizations = (await orgsResponse.json() as { items: { id: string; name: string; kind: string; approved: boolean }[] }).items;
  // Duplicate seeded rows share a name; an already-approved one is the stable pick.
  const byName = (kind: string, name: string) => organizations.filter(item => item.kind === kind && item.name === name);
  const company = byName("company", COMPANY_NAME).sort((a, b) => Number(b.approved) - Number(a.approved))[0];
  const school = byName("school", SCHOOL_NAME).sort((a, b) => Number(b.approved) - Number(a.approved))[0];
  expect(company).toBeTruthy();
  expect(school).toBeTruthy();
  for (const org of [company!, school!]) {
    const approved = await request.patch(`${API}/admin/organizations/${org.id}`, {
      headers: adminHeaders,
      data: { approved: true },
    });
    expect(approved.ok()).toBe(true);
  }

  // Recruiter membership in the approved company (idempotent: 409 = already there).
  const usersResponse = await request.get(`${API}/admin/users?q=recruiter`, { headers: adminHeaders });
  expect(usersResponse.ok()).toBe(true);
  const recruiterUser = (await usersResponse.json() as { items: { id: string; email: string | null }[] }).items
    .find(item => item.email === RECRUITER.user);
  expect(recruiterUser).toBeTruthy();
  const membership = await request.post(`${API}/admin/organizations/${company!.id}/members`, {
    headers: adminHeaders,
    data: { user_id: recruiterUser!.id, role: "recruiter" },
  });
  expect(membership.ok() || membership.status() === 409).toBe(true);

  // Candidate opted in and holds an active recruiter_search grant to that company.
  const optedIn = await request.patch(`${API}/users/me`, {
    headers: studentHeaders,
    data: { recruiter_searchable: true },
  });
  expect(optedIn.ok()).toBe(true);
  expect((await optedIn.json() as { recruiter_searchable: boolean }).recruiter_searchable).toBe(true);
  await setConsent(request, studentToken, company!.id, true);

  try {
    await signIn(page, RECRUITER);
    await expect(page.getByRole("link", { name: "Candidate search" })).toBeVisible();
    await page.getByRole("link", { name: "Candidate search" }).click();
    await expect(page).toHaveURL(/\/candidates$/);
    await expect(page.getByRole("heading", { name: "Candidate search" })).toBeVisible();

    const companySelect = page.getByRole("combobox", { name: "Company organization" });
    const schoolSelect = page.getByRole("combobox", { name: "Target school" });
    const submit = page.getByRole("button", { name: /search candidates/i });
    const resultsHeading = page.getByRole("heading", { name: /Results · page/ });

    // Both scopes are mandatory: the button stays disabled until each is chosen.
    await expect(companySelect).toBeVisible();
    await expect(submit).toBeDisabled();
    await companySelect.selectOption(company!.id);
    await expect(submit).toBeDisabled();
    await schoolSelect.selectOption(school!.id);
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(resultsHeading).toBeVisible();
    await expect(page.getByText(STUDENT_NAME)).toBeVisible();

    // Changing the school invalidates results produced under the old scope.
    await schoolSelect.selectOption("");
    await expect(page.getByText(STUDENT_NAME)).toHaveCount(0);
    await expect(resultsHeading).toHaveCount(0);
    await expect(submit).toBeDisabled();

    // Consent revoked at the source: the same search must no longer return her.
    await setConsent(request, studentToken, company!.id, false);
    await schoolSelect.selectOption(school!.id);
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(resultsHeading).toBeVisible();
    await expect(page.getByText("No matching candidates")).toBeVisible();
    await expect(page.getByText(STUDENT_NAME)).toHaveCount(0);
  } finally {
    // Leave the candidate's baseline consent enabled for every other suite.
    await setConsent(request, studentToken, company!.id, true);
  }

  // The restored consent is real, not just a UI state: the API returns her again.
  const afterRestore = await request.post(`${API}/candidates/search`, {
    headers: recruiterHeaders,
    data: { organization_id: company!.id, school_id: school!.id, skills: [], match: "all", verified_only: false, require_shared_project: false, page: 1, page_size: 20 },
  });
  expect(afterRestore.ok()).toBe(true);
  const hits = (await afterRestore.json() as { items: { display_name: string | null }[] }).items;
  expect(hits.some(item => item.display_name === STUDENT_NAME)).toBe(true);

  // The admin suite asserts the opt-in flag flips from its default, so put the
  // candidate's profile flag back the way the fixture left it.
  const reset = await request.patch(`${API}/users/me`, {
    headers: studentHeaders,
    data: { recruiter_searchable: false },
  });
  expect(reset.ok()).toBe(true);
  expect((await reset.json() as { recruiter_searchable: boolean }).recruiter_searchable).toBe(false);
});
