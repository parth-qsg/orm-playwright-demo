import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Authentication - Route protection', () => {
  test('AJ-TC-3 - Prevent access to Admin > System Users without authentication and redirect to login', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange: Open the Admin > System Users page directly with no authenticated session
    await systemUsersPage.goto();

    // Assert: User is redirected to the login page
    await loginPage.assertOnLoginPage();

    // Act: Login with valid Admin credentials
    await loginPage.login(process.env.ORANGEHRM_ADMIN_USERNAME ?? 'Admin', process.env.ORANGEHRM_ADMIN_PASSWORD ?? 'admin123');

    // Act: Navigate to Admin > System Users again
    await systemUsersPage.goto();

    // Assert: System Users page loads
    await systemUsersPage.assertOnSystemUsersPage();
  });
});
