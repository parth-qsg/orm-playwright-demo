import { test } from '@playwright/test';
import { OrangeHrmDashboardPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-15 - Login', () => {
  test('Verify successful login with valid credentials and access to the dashboard', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const dashboardPage = new OrangeHrmDashboardPage(page);

    // Arrange
    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD environment variables.',
      );
    }

    await loginPage.goto();

    // Assert: login page UI
    await loginPage.assertOnLoginPage();
    await loginPage.assertLoginFormUiVisible();

    // Act
    await loginPage.fillUsername(username);
    await loginPage.fillPassword(password);

    // Assert: password input is masked
    await loginPage.assertPasswordInputIsMasked();

    await loginPage.clickLogin();

    // Assert: redirected to dashboard
    await dashboardPage.assertOnDashboardPage();
  });
});
