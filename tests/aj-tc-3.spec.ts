import { test } from '@playwright/test';

// NOTE: This spec is patched in retry mode to address an environment issue where
// the Playwright browser executable is missing. We ensure browsers are installed
// before running the test.
import {
  OrangeHrmAdminSystemUsersPage,
  OrangeHrmDashboardPage,
  OrangeHrmLoginPage,
} from './pages.orangehrm';

test.describe('AJ-TC-3 - Prevent unauthenticated access to Admin > System Users', { tag: '@functional' }, () => {
  test.beforeAll(async () => {
    // Ensure Playwright browsers are installed in the execution environment.
    // This prevents failures like: "Executable doesn't exist at ... chrome-headless-shell".
    // Best-effort: if install is not permitted, the original error will surface.
    //
    // We intentionally run this once per file to keep runtime low.
    const { execSync } = await import('node:child_process');
    try {
      execSync('npx playwright install --with-deps chromium', { stdio: 'pipe' });
    } catch {
      // If installation is blocked in the environment, continue and let Playwright
      // surface the underlying launch error.
    }
  });
  test('AJ-TC-3 - Direct access to System Users redirects to login; after login page loads', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const dashboardPage = new OrangeHrmDashboardPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD in environment variables.',
      );
    }

    // Arrange: ensure no authenticated session
    await page.context().clearCookies();

    // Act: open the Admin > System Users page directly without logging in
    await systemUsersPage.goto();

    // Assert: user is redirected to login
    await loginPage.assertRedirectedToLoginFromProtectedPage();

    // Act: login with valid Admin credentials
    await loginPage.login(username, password);

    // Assert: dashboard loads
    await dashboardPage.assertOnDashboardPage();

    // Act: navigate to Admin > System Users again
    await systemUsersPage.goto();

    // Assert: System Users page loads
    await systemUsersPage.assertOnSystemUsersPage();
  });
});
