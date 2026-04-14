import { test } from '@playwright/test';
import { OrangeHrmDashboardPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-15 - Login - Valid credentials redirect to dashboard', () => {
  test('Verify successful login with valid credentials and access to the dashboard', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const dashboardPage = new OrangeHrmDashboardPage(page);

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    test.skip(!username || !password, 'Missing TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD) environment variables.');

    // Arrange: Open login page
    await loginPage.goto();

    // Assert: Login page UI
    await loginPage.assertOnLoginPage();
    await loginPage.assertUsernameTextboxVisible();
    await loginPage.assertPasswordTextboxVisible();
    await loginPage.assertPasswordInputIsMasked();

    // Act: Login with env credentials
    await loginPage.login(username, password);

    // Assert: Dashboard loads
    await dashboardPage.assertOnDashboardPage();
    await dashboardPage.assertAdminMenuVisible();
  });
});
