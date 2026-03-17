import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Admin - System Users', () => {
  test('AI-TC-2 - Prevent access to System Users without authentication and redirect to login', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange: Ensure no active authenticated session
    await page.context().clearCookies();
    await page.evaluate(() => window.localStorage.clear());
    await page.evaluate(() => window.sessionStorage.clear());

    // Act: Attempt to open System Users directly without logging in
    await systemUsersPage.goto();

    // Assert: Direct access is blocked and user is redirected to Login
    await loginPage.assertOnLoginPage();
  });
});
