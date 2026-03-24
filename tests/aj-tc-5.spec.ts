import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-5 - Admin - System Users - Username search performance', () => {
  test('c2972408-4d36-4471-9f52-165fbdaa0dea - Search by Username Admin completes within 2000ms', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const username: string = process.env.ORANGEHRM_ADMIN_USERNAME ?? 'Admin';
    const password: string = process.env.ORANGEHRM_ADMIN_PASSWORD ?? 'admin123';

    // Arrange: Open login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Arrange: Login as Admin
    await loginPage.login(username, password);

    // Arrange: Navigate to Admin > System Users
    // (Use direct navigation for stability and to avoid left-menu click interception.)
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: Search for username 'Admin' and record elapsed time
    const startMs: number = Date.now();
    await systemUsersPage.searchByUsername('Admin');
    await systemUsersPage.waitForResultsToLoad();
    const elapsedMs: number = Date.now() - startMs;

    // Assert: Search completed within acceptable time and results are displayed
    await systemUsersPage.assertUsernameFilterValue('Admin');
    await systemUsersPage.assertSearchCompletedWithinMs({ maxMs: 2000, elapsedMs });
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');
  });
});
