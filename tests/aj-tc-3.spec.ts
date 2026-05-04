import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';


type AdminCredentials = { username: string; password: string };

function getAdminCredentials(): AdminCredentials {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
  const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Missing admin credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD in environment variables.',
    );
  }

  return { username, password };
}

function getSystemUsersUrl(): string {
  const baseUrl =
    process.env.BASE_URL ??
    process.env.ORANGEHRM_BASE_URL ??
    'https://opensource-demo.orangehrmlive.com';

  return `${baseUrl}/web/index.php/admin/viewSystemUsers`;
}

test.describe('AJ-TC-3 - Admin > System Users authentication guard', { tag: ['@functional'] }, () => {
  test('AJ-TC-3 - Prevent unauthenticated access to System Users and require login', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);
    const { username, password } = getAdminCredentials();

    // Arrange: no active authenticated session
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    // Act: open the Admin > System Users page URL directly without logging in
    // NOTE: We intentionally navigate directly (not via SystemUsersPage.goto()) because that method
    // asserts the Admin URL, which is not true when the auth guard redirects to Login.
    await page.goto(getSystemUsersUrl());

    // Assert: redirection to the login page
    await loginPage.assertOnLoginPage();

    // Act: login with valid Admin credentials
    await loginPage.login(username, password);

    // Act: navigate to Admin > System Users again
    await systemUsersPage.goto();

    // Assert: System Users page loads after authentication
    await systemUsersPage.assertOnSystemUsersPage();
  });
});
