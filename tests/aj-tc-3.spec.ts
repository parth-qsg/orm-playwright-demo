import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-3 - Admin > System Users authentication guard', () => {
  test('AJ-TC-3 - Prevent unauthenticated access to System Users and require login', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange: ensure no authenticated session by starting with a clean state
    await page.context().clearCookies();

    // Act: open System Users directly without logging in
    await systemUsersPage.goto();

    // Assert: user is redirected to login
    await loginPage.assertOnLoginPage();

    // Act: login with valid Admin credentials
    await loginPage.login('Admin', 'admin123');

    // Act: navigate to Admin > System Users again
    await systemUsersPage.goto();

    // Assert: System Users page loads
    await systemUsersPage.assertOnSystemUsersPage();
  });
});
