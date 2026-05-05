import { test } from '@playwright/test';

import {
  OrangeHrmAdminSystemUsersPage,
  OrangeHrmDashboardPage,
  OrangeHrmLoginPage,
} from './pages.orangehrm';

test.describe(
  'AJ-TC-3 - Prevent access to Admin > System Users without authentication',
  { tag: '@functional' },
  () => {
    test('AJ-TC-3 - Direct URL access redirects to login; after login System Users loads', async ({ page }) => {
      const loginPage = new OrangeHrmLoginPage(page);
      const dashboardPage = new OrangeHrmDashboardPage(page);
      const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

      const username: string | undefined = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
      const password: string | undefined = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

      if (!username || !password) {
        throw new Error(
          'Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD in environment variables.',
        );
      }

      // Arrange: start from a fresh, unauthenticated session
      await page.context().clearCookies();

      // Act: open the Admin > System Users page URL directly without logging in
      // NOTE: Do not use systemUsersPage.goto() here because it asserts the System Users URL,
      // while the expected behavior for unauthenticated users is a redirect to the login page.
      const systemUsersUrl: string = process.env.ORANGEHRM_BASE_URL
        ? `${process.env.ORANGEHRM_BASE_URL}/web/index.php/admin/viewSystemUsers`
        : 'https://opensource-demo.orangehrmlive.com/web/index.php/admin/viewSystemUsers';

      await page.goto(systemUsersUrl);

      // Assert: redirection to the login page
      await loginPage.assertRedirectedToLoginFromProtectedPage();

      // Act: login with valid Admin credentials
      await loginPage.login(username, password);

      // Assert: dashboard loads
      await dashboardPage.assertOnDashboardPage();

      // Act: navigate to Admin > System Users again
      await systemUsersPage.goto();

      // Assert: System Users page loads
      await systemUsersPage.assertOnSystemUsersPage();
    });
  },
);
