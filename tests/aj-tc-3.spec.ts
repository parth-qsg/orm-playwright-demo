import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-3 - Admin > System Users authentication guard', () => {
  test('AJ-TC-3 - Direct access redirects to login and allows access after authentication', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const username: string = process.env.ORANGEHRM_ADMIN_USERNAME ?? 'Admin';
    const password: string = process.env.ORANGEHRM_ADMIN_PASSWORD ?? 'admin123';

    // Arrange: ensure no active authenticated session
    await page.context().clearCookies();

    // Act: Open the Admin > System Users URL directly without logging in
    await systemUsersPage.goto();

    // Assert: User is redirected to the login page
    await loginPage.assertOnLoginPage();

    // Act: Login with valid Admin credentials
    await loginPage.login(username, password);

    // Act: Navigate to Admin > System Users again
    await systemUsersPage.goto();

    // Assert: System Users page loads
    await systemUsersPage.assertOnSystemUsersPage();
  });
});
