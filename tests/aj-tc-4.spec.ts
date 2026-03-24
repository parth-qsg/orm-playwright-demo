import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-4 - Admin - System Users - Username search is case-insensitive', () => {
  test('a16497c7-c287-4d38-908d-25db898cd97a - Search by Username Admin is case-insensitive and returns the Admin user', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const username: string = process.env.ORANGEHRM_ADMIN_USERNAME ?? 'Admin';
    const password: string = process.env.ORANGEHRM_ADMIN_PASSWORD ?? 'admin123';

    // Arrange: Open login page and authenticate as Admin
    await loginPage.goto();
    await loginPage.assertOnLoginPage();
    await loginPage.login(username, password);

    // Arrange: Navigate to Admin > System Users
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: Search with lowercase username
    await systemUsersPage.searchByUsername('admin');

    // Assert: Search input has value and results contain Admin user
    await systemUsersPage.assertUsernameFilterValue('admin');
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');

    // Act: Clear and search with uppercase username
    await systemUsersPage.clearUsernameSearch();
    await systemUsersPage.searchByUsername('ADMIN');

    // Assert: Search input has value and results contain Admin user
    await systemUsersPage.assertUsernameFilterValue('ADMIN');
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');
  });
});
