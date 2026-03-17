import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Admin - System Users', () => {
  test('AJ-TC-1 - Verify successful user search returns exactly one Admin user', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange: open login page and authenticate
    await loginPage.goto();
    await loginPage.login(
      process.env.ADMIN_USERNAME ?? 'Admin',
      process.env.ADMIN_PASSWORD ?? 'admin123',
    );

    // Arrange: open System Users page
    await systemUsersPage.goto();

    // Act: search by username "Admin"
    await systemUsersPage.searchByUsername('Admin');

    // Assert: exactly one record is returned and username is Admin
    await systemUsersPage.assertRecordFoundCount(1);
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');
  });
});
