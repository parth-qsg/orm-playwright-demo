import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-2 - Admin - System Users no-results search', () => {
  test('AJ-TC-2 - No-result search returns zero records when searching for an invalid username', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const adminUsername: string = process.env.ADMIN_USERNAME ?? 'Admin';
    const adminPassword: string = process.env.ADMIN_PASSWORD ?? 'admin123';
    const invalidUsername: string = 'invalid_user_12345';

    // Arrange: Open the login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Arrange: Login as Admin
    await loginPage.login(adminUsername, adminPassword);

    // Arrange: Navigate to Admin > System Users
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: Search for a non-existent username
    await systemUsersPage.searchByUsername(invalidUsername);

    // Assert: Search input contains the invalid username and results are empty
    await systemUsersPage.assertUsernameFilterValue(invalidUsername);
    await systemUsersPage.assertNoRecordsFound();
  });
});
