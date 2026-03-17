import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Admin - System Users', () => {
  test('AJ-TC-2 - No-result search returns zero records for invalid username', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange: open login page and authenticate
    await loginPage.goto();
    await loginPage.login(process.env.ADMIN_USERNAME ?? 'Admin', process.env.ADMIN_PASSWORD ?? 'admin123');

    // Arrange: open System Users page
    await systemUsersPage.goto();

    // Act: search by a non-existent username
    await systemUsersPage.searchByUsername('invalid_user_12345');

    // Assert: empty results
    await systemUsersPage.assertNoRecordsFound();
  });
});
