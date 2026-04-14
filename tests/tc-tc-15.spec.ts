import { test } from '@playwright/test';
import { OrangeHrmDashboardPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-15 - Login - Successful login redirects to dashboard', () => {
  test('User logs in with valid credentials and accesses the dashboard', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const dashboardPage = new OrangeHrmDashboardPage(page);

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    test.skip(!username || !password, 'Missing credentials: set TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD).');

    // Arrange: Open login page and verify UI
    await loginPage.goto();
    await loginPage.assertOnLoginPage();
    await loginPage.assertUsernameTextboxVisible();
    await loginPage.assertPasswordTextboxVisible();
    await loginPage.assertForgotPasswordLinkVisible();

    // Act: Enter credentials and login
    await loginPage.fillUsername(username);
    await loginPage.assertPasswordInputRemainsMaskedAfterTyping(password);
    await loginPage.clickLogin();

    // Assert: Dashboard loads and URL reflects the dashboard
    await dashboardPage.assertOnDashboardPage();
  });
});
