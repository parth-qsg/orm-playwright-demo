import { test } from '@playwright/test';
import {
  OrangeHrmAdminSystemUsersPage,
  OrangeHrmLoginPage,
} from './pages.orangehrm';

test.describe('AJ-TC-5 - System Users search performance', () => {
  test('Search - completes within 2000ms when searching by Username Admin', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange: open login page and authenticate
    await loginPage.goto();
    await loginPage.assertOnLoginPage();
    await loginPage.login(
      process.env.ORANGEHRM_USERNAME ?? 'Admin',
      process.env.ORANGEHRM_PASSWORD ?? 'admin123',
    );

    // Arrange: navigate directly to Admin > System Users
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: search by Username = Admin and measure render time
    const startMs = Date.now();
    await systemUsersPage.searchByUsername('Admin');
    const elapsedMs = Date.now() - startMs;

    // Assert: results are displayed within 2000ms
    await systemUsersPage.assertSearchCompletedWithinMs({ maxMs: 2000, elapsedMs });
  });
});
