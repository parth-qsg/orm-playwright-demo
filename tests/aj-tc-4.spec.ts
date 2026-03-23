import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-4 - Admin System Users search', () => {
  test('AJ-TC-4 - Search by Username is case-insensitive and returns Admin user', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange: Open login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Arrange: Login as Admin
    await loginPage.login(process.env.ADMIN_USERNAME ?? 'Admin', process.env.ADMIN_PASSWORD ?? 'admin123');

    // Arrange: Open Admin > System Users
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: Search by username in lowercase
    await systemUsersPage.searchByUsername('admin');

    // Assert: Admin user is returned
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');

    // Act: Search by username in uppercase
    await systemUsersPage.searchByUsername('ADMIN');

    // Assert: Admin user is returned
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');
  });
});
