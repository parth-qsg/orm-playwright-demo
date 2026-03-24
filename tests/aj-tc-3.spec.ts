import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-3 - Admin > System Users authentication gate', () => {
  test('Unauthenticated access redirects to login; authenticated user can access System Users', async ({ page }) => {
    // Arrange
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Act: open System Users directly without session
    await systemUsersPage.goto();

    // Assert: redirected to login
    await loginPage.assertOnLoginPage();

    // Act: login with valid admin credentials
    await loginPage.login('Admin', 'admin123');

    // Act: navigate to System Users again
    await systemUsersPage.goto();

    // Assert: System Users loads
    await systemUsersPage.assertOnSystemUsersPage();
  });
});
