import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-4 - Admin System Users search', () => {
  test('AJ-TC-4 - Search by Username Admin is case-insensitive and returns the Admin user', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const adminUsername: string = process.env.ADMIN_USERNAME ?? 'Admin';
    const adminPassword: string = process.env.ADMIN_PASSWORD ?? 'admin123';

    // Arrange: Open the login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Arrange: Login as Admin
    await loginPage.login(adminUsername, adminPassword);

    // Arrange: Navigate to Admin > System Users
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: Search by username using lowercase input
    await systemUsersPage.searchByUsername('admin');

    // Assert: Search input contains 'admin' and Admin user is returned
    await systemUsersPage.assertUsernameFilterValue('admin');
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');

    // Act: Clear the search field
    await systemUsersPage.clearUsernameSearch();
    await systemUsersPage.assertUsernameFilterValue('');

    // Act: Search by username using uppercase input
    await systemUsersPage.searchByUsername('ADMIN');

    // Assert: Search input contains 'ADMIN' and Admin user is returned
    await systemUsersPage.assertUsernameFilterValue('ADMIN');
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');
  });
});
