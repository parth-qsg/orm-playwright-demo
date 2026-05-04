import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-4 - Admin user search is case-insensitive', { tag: '@functional' }, () => {
  test('Search by Username Admin is case-insensitive and returns the Admin user', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const username: string = process.env.TEST_USERNAME ?? process.env.APP_USERNAME ?? '';
    const password: string = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD ?? '';

    if (!username || !password) {
      throw new Error(
        'Missing credentials: set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD environment variables.',
      );
    }

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();
    await loginPage.login(username, password);

    // Navigate to Admin > System Users (direct navigation to avoid flaky side-menu click interception)
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: search with lowercase
    await systemUsersPage.searchByUsername('admin');

    // Assert: Admin user returned
    await systemUsersPage.assertUsernameFilterValue('admin');
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');

    // Act: search with uppercase
    await systemUsersPage.clearUsernameSearch();
    await systemUsersPage.searchByUsername('ADMIN');

    // Assert: Admin user returned
    await systemUsersPage.assertUsernameFilterValue('ADMIN');
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');
  });
});
