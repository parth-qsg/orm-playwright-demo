import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

function getAdminCredentials(): { username: string; password: string } {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
  const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Missing admin credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD in environment variables.',
    );
  }

  return { username, password };
}

test.describe(
  'AJ-TC-3 - Admin > System Users authentication guard',
  { tag: ['@functional'] },
  () => {
    test(
      'AJ-TC-3 - Prevent unauthenticated access to System Users and require login',
      async ({ page }) => {
        const loginPage = new OrangeHrmLoginPage(page);
        const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);
        const { username, password } = getAdminCredentials();

        // Arrange: ensure no authenticated session by starting with a clean state
        await page.context().clearCookies();

        // Act: open System Users directly without logging in
        await systemUsersPage.goto();

        // Assert: user is redirected to login
        await loginPage.assertOnLoginPage();

        // Act: login with valid Admin credentials
        await loginPage.login(username, password);

        // Act: navigate to Admin > System Users again
        await systemUsersPage.goto();

        // Assert: System Users page loads
        await systemUsersPage.assertOnSystemUsersPage();
      },
    );
  },
);
