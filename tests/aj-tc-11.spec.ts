import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Admin - System Users', () => {
  test('AJ-TC-11 - Search yielding zero results shows empty state', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD in environment variables.',
      );
    }

    // Arrange: login as admin
    await loginPage.goto();
    await loginPage.login(username, password);

    // Arrange: ensure we are on System Users page
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: search for a non-existent username
    const nonExistentUsername = 'nonexistent_user_xyz';
    await systemUsersPage.searchByUsername(nonExistentUsername);

    // Assert: input accepted and empty state shown
    await systemUsersPage.assertUsernameFilterValue(nonExistentUsername);
    await systemUsersPage.assertNoRecordsFound();
  });
});
