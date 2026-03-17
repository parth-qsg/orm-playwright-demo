import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Admin - System Users - Performance', () => {
  test('AJ-TC-5 - Search by Username Admin completes within 2000 ms', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange: open login page and authenticate
    await loginPage.goto();
    await loginPage.assertOnLoginPage();
    await loginPage.login(process.env.ADMIN_USERNAME ?? 'Admin', process.env.ADMIN_PASSWORD ?? 'admin123');

    // Arrange: open System Users page
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: search by username "Admin" and record duration
    const start = Date.now();
    await systemUsersPage.searchByUsername('Admin');
    const elapsedMs = Date.now() - start;

    // Assert: results are displayed and the search completes within 2000ms
    await systemUsersPage.assertSearchCompletedWithinMs(2000, elapsedMs);
  });
});
