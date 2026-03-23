import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Admin - System Users', () => {
  test('AJ-TC-2 - No-result search returns zero records for invalid username', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange: Open login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Arrange: Login with Admin credentials
    await loginPage.login(process.env.ADMIN_USERNAME ?? 'Admin', process.env.ADMIN_PASSWORD ?? 'admin123');

    // Arrange: Navigate to Admin > System Users
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: Search with an invalid username
    await systemUsersPage.searchByUsername('invalid_user_12345');

    // Assert: Filter contains the searched value and no records are returned
    await systemUsersPage.assertUsernameFilterValue('invalid_user_12345');
    await systemUsersPage.assertNoRecordsFound();
  });
});
