import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Admin - System Users', () => {
  test('AJ-TC-2 - No-result search returns zero records for invalid username', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange: open login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Arrange: login as Admin
    await loginPage.login(process.env.ADMIN_USERNAME ?? 'Admin', process.env.ADMIN_PASSWORD ?? 'admin123');

    // Act: open System Users page (Admin > System Users)
    // NOTE: navigating directly avoids occasional UI click interception on the side panel.
    await systemUsersPage.goto();

    // Act: search by a non-existent username
    await systemUsersPage.searchByUsername('invalid_user_12345');

    // Assert: input value retained and empty results shown
    await systemUsersPage.assertUsernameFilterValue('invalid_user_12345');
    await systemUsersPage.assertNoRecordsFound();
  });
});
