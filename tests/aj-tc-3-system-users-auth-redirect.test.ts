import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Admin - System Users', () => {
  test('AJ-TC-3 - Prevent access to System Users without authentication and redirect to login', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange: ensure no active authenticated session
    await page.context().clearCookies();

    // Act + Assert: attempt to open System Users directly without logging in; expect login redirect
    await page.goto(
      process.env.ORANGEHRM_BASE_URL
        ? `${process.env.ORANGEHRM_BASE_URL}/web/index.php/admin/viewSystemUsers`
        : 'https://opensource-demo.orangehrmlive.com/web/index.php/admin/viewSystemUsers',
    );
    await loginPage.assertOnLoginPage();

    // Act: login with valid admin credentials
    await loginPage.login(process.env.ADMIN_USERNAME ?? 'Admin', process.env.ADMIN_PASSWORD ?? 'admin123');

    // Act: navigate to System Users again
    await systemUsersPage.goto();

    // Assert: System Users page loads
    await systemUsersPage.assertOnSystemUsersPage();
  });
});
