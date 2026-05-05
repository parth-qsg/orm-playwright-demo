import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmDashboardPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-9: Exact-match search shows a single record and count is 1', () => {
  test('Exact-match search returns a single record and count 1', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const dashboardPage = new OrangeHrmDashboardPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
    if (!username || !password) {
      throw new Error('Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD).');
    }

    // Arrange: Admin is logged in and on System Users page
    await loginPage.goto();
    await loginPage.login(username, password);
    await dashboardPage.clickAdminMenu();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: Enter exact username and search
    const searchUsername = 'empire';
    await systemUsersPage.searchByUsername(searchUsername);

    // Assert: Exactly one record is displayed and the count shows 1
    await systemUsersPage.assertExactlyOneUsernameResult(searchUsername);
  });
});
