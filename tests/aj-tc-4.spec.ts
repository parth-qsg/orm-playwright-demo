import { test } from '@playwright/test';
import {
  OrangeHrmAdminSystemUsersPage,
  OrangeHrmDashboardPage,
  OrangeHrmLoginPage,
} from './pages.orangehrm';

test.describe('AJ-TC-4 - Admin user search is case-insensitive', { tag: ['@functional'] }, () => {
  test('Search by Username Admin is case-insensitive and returns the Admin user', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const dashboardPage = new OrangeHrmDashboardPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const username: string = process.env.TEST_USERNAME ?? process.env.APP_USERNAME ?? '';
    const password: string = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD ?? '';

    if (!username || !password) {
      throw new Error(
        'Missing credentials: set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD environment variables.',
      );
    }

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();
    await loginPage.login(username, password);
    await dashboardPage.assertOnDashboardPage();

    await dashboardPage.clickAdminMenu();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act + Assert: lowercase search
    await systemUsersPage.searchByUsername('admin');
    await systemUsersPage.assertUsernameFilterValue('admin');
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');

    // Act + Assert: uppercase search
    await systemUsersPage.clearUsernameSearch();
    await systemUsersPage.searchByUsername('ADMIN');
    await systemUsersPage.assertUsernameFilterValue('ADMIN');
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');
  });
});
