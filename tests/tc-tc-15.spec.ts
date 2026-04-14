import { test } from '@playwright/test';
import { OrangeHrmDashboardPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-15 - Login', () => {
  test('Verify successful login with valid credentials and access to the dashboard', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const dashboardPage = new OrangeHrmDashboardPage(page);

    // Arrange: Open the login page
    await loginPage.goto();

    // Assert: Verify the login page UI
    await loginPage.assertOnLoginPage();
    await loginPage.assertUsernameTextboxVisible();
    await loginPage.assertPasswordTextboxVisible();

    // Act: Enter credentials (from environment variables only)
    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    test.skip(!username || !password, 'Missing TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD) environment variables.');

    await loginPage.fillUsername(username);
    await loginPage.assertUsernameValue(username);

    await loginPage.fillPassword(password);

    // Assert: Password is masked
    await loginPage.assertPasswordInputIsMasked();

    // Act: Click login
    await loginPage.clickLogin();

    // Assert: Dashboard loads and URL reflects the dashboard
    await dashboardPage.assertOnDashboardPage();
    await dashboardPage.assertAdminMenuVisible();
  });
});
