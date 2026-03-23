import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Authentication guard - Admin > System Users', () => {
  test('AJ-TC-3 - Prevent access to System Users without authentication and redirect to login', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const adminUsername: string = process.env.ADMIN_USERNAME ?? 'Admin';
    const adminPassword: string = process.env.ADMIN_PASSWORD ?? 'admin123';

    // Arrange: ensure there is no active authenticated session
    await page.context().clearCookies();

    // Act: open the Admin > System Users URL directly (unauthenticated)
    await systemUsersPage.goto();

    // Assert: user is redirected to login page
    await loginPage.assertOnLoginPage();

    // Act: login with valid Admin credentials
    await loginPage.login(adminUsername, adminPassword);

    // Act: navigate to Admin > System Users again
    await systemUsersPage.goto();

    // Assert: System Users page loads
    await systemUsersPage.assertOnSystemUsersPage();
  });
});
