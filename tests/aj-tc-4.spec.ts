import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  OrangeHrmAdminSystemUsersPage,
  OrangeHrmDashboardPage,
  OrangeHrmLoginPage,
} from './pages.orangehrm';

test.describe('AJ-TC-4 - Admin user search is case-insensitive', { tag: ['@functional'] }, () => {
  test.beforeEach(async () => {
    // Environment guard: some runners may not have Playwright browsers installed.
    // If the expected browser cache path is missing, skip with actionable guidance.
    const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/ms-playwright';
    const resolved = path.resolve(browsersPath);
    test.skip(
      !fs.existsSync(resolved),
      `Playwright browsers not found at ${resolved}. Install browsers in the runner image or set PLAYWRIGHT_BROWSERS_PATH correctly.`,
    );
  });
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

    // Arrange: login
    await loginPage.goto();
    await loginPage.assertOnLoginPage();
    await loginPage.login(username, password);
    await dashboardPage.assertOnDashboardPage();

    // Arrange: navigate to Admin > System Users
    // Note: direct navigation is used to avoid side-menu click flakiness.
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act + Assert: search with lowercase
    await systemUsersPage.searchByUsername('admin');
    await systemUsersPage.assertUsernameFilterValue('admin');
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');

    // Act + Assert: search with uppercase
    await systemUsersPage.clearUsernameSearch();
    await systemUsersPage.searchByUsername('ADMIN');
    await systemUsersPage.assertUsernameFilterValue('ADMIN');
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');
  });
});
