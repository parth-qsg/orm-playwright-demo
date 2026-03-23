import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-1 - Admin user search', () => {
  test('AJ-TC-1 - Verify successful user search returns exactly one Admin user', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const adminUsername: string = process.env.ADMIN_USERNAME ?? 'Admin';
    const adminPassword: string = process.env.ADMIN_PASSWORD ?? 'admin123';
    const searchUsername: string = 'Admin';

    // Arrange: Open login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Arrange: Login as Admin
    await loginPage.login(adminUsername, adminPassword);

    // Arrange: Navigate to Admin > System Users
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: Search by Username = Admin
    await systemUsersPage.searchByUsername(searchUsername);

    // Assert: Search input contains "Admin"
    await systemUsersPage.assertUsernameFilterValue(searchUsername);

    // Assert: Exactly one record is returned and the username is Admin
    await systemUsersPage.assertRecordFoundCount(1);
    await systemUsersPage.assertExactlyOneUsernameResult(searchUsername);
  });
});
