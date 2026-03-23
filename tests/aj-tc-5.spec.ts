import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-5 - Search performance (Username = Admin)', () => {
  test('Search operation completes within 2000 ms when searching by Username Admin', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const username: string = process.env.ORANGEHRM_ADMIN_USERNAME ?? 'Admin';
    const password: string = process.env.ORANGEHRM_ADMIN_PASSWORD ?? 'admin123';
    const searchUsername: string = 'Admin';
    const maxSearchMs: number = 2000;

    // Arrange: Open login page and authenticate
    await loginPage.goto();
    await loginPage.assertOnLoginPage();
    await loginPage.login(username, password);

    // Arrange: Navigate to Admin > System Users
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: Search by Username and record elapsed time for results to render
    const startMs: number = Date.now();
    await systemUsersPage.searchByUsername(searchUsername);
    const elapsedMs: number = Date.now() - startMs;

    // Assert: Results are displayed and load within the acceptable time threshold
    await systemUsersPage.assertSearchCompletedWithinMs({ maxMs: maxSearchMs, elapsedMs });
    await systemUsersPage.assertExactlyOneUsernameResult(searchUsername);
  });
});
