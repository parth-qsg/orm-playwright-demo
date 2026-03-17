import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Admin - System Users', () => {
  test('AJ-TC-4 - Username search is case-insensitive and returns Admin for admin/ADMIN', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange: open login page and authenticate
    await loginPage.goto();
    await loginPage.assertOnLoginPage();
    await loginPage.login(process.env.ADMIN_USERNAME ?? 'Admin', process.env.ADMIN_PASSWORD ?? 'admin123');

    // Arrange: open System Users page
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: search with lowercase username
    await systemUsersPage.searchByUsername('admin');

    // Assert: Admin is returned
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');

    // Act: clear and search with uppercase username
    await systemUsersPage.searchByUsername('ADMIN');

    // Assert: Admin is returned
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');
  });
});
