import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Admin - System Users', () => {
  test('AJ-TC-3 - Prevent access to System Users without authentication and redirect to login', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange: ensure no active authenticated session
    await page.context().clearCookies();
    await page.evaluate(() => window.localStorage.clear());
    await page.evaluate(() => window.sessionStorage.clear());

    // Act: attempt to open System Users directly without logging in
    await systemUsersPage.goto();

    // Assert: user is redirected to login page (should not stay on System Users)
    await loginPage.assertOnLoginPage();

    // Act: login with valid admin credentials
    await loginPage.login(process.env.ADMIN_USERNAME ?? 'Admin', process.env.ADMIN_PASSWORD ?? 'admin123');

    // Act: navigate to System Users again
    await systemUsersPage.goto();

    // Assert: System Users page loads
    await systemUsersPage.assertOnSystemUsersPage();
  });
});
