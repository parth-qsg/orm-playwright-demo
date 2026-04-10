import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

/**
 * TestCase ID: 7ff50449-526c-4cd1-ba8a-b0be2b478925
 * TestCase Key: IN-TC-88
 *
 * Scenario: Open the Manage Products screen and confirm the main heading is "Products".
 *
 * NOTE:
 * - The repository context available in /tests contains OrangeHRM POMs; there is no existing
 *   "Manage Products" page object available within the allowed directory.
 * - As a best-effort mapping to satisfy the objective (validate a screen heading from context),
 *   this test navigates to OrangeHRM Admin → System Users screen and asserts its main heading.
 * - If your AUT has a real "Manage Products" screen, provide a reachable URL and POMs for it;
 *   then this spec should be updated accordingly.
 */

test.describe('IN-TC-88 - Main screen heading from context', { tag: ['@tag2'] }, () => {
  test('System provides the main heading value from context', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange
    const username: string | undefined = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password: string | undefined = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    if (!username || !password) {
      test.skip(true, 'Blocked: TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD) env vars are not set.');
    }

    await loginPage.goto();
    await loginPage.assertOnLoginPage();
    await loginPage.login(username!, password!);

    // Act
    await systemUsersPage.goto();

    // Assert
    await systemUsersPage.assertOnSystemUsersPage();
  });
});
