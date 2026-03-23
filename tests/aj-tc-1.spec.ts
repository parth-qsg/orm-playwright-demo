import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-1 - Admin user search', () => {
  test('Verify successful user search returns exactly one Admin user', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const adminUsername: string = process.env.ADMIN_USERNAME ?? 'Admin';
    const adminPassword: string = process.env.ADMIN_PASSWORD ?? 'admin123';

    // Arrange: Open login page and authenticate
    await loginPage.goto();
    await loginPage.assertOnLoginPage();
    await loginPage.login(adminUsername, adminPassword);

    // Act: Navigate to Admin > System Users and search by Username
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();
    await systemUsersPage.searchByUsername('Admin');

    // Assert: Exactly one record is returned and username is Admin
    await systemUsersPage.assertRecordFoundCount(1);
    await systemUsersPage.assertUsernameFilterValue('Admin');
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');
  });
});
