import { test } from '@playwright/test';
import { OrangeHrmDashboardPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-23 - Auth - Successful login with valid Admin credentials redirects to dashboard', () => {
  test('Admin logs in and sees Admin modules on the dashboard', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const dashboardPage = new OrangeHrmDashboardPage(page);

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    test.skip(!username || !password, 'Missing credentials: set TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD).');

    // Arrange: Open login page and verify Username input is present and enabled
    await loginPage.goto();
    await loginPage.assertOnLoginPage();
    await loginPage.assertUsernameTextboxVisible();

    // Act: Enter credentials and log in
    await loginPage.fillUsername(username);
    await loginPage.fillPassword(password);
    await loginPage.clickLogin();

    // Assert: Dashboard page is displayed, URL matches dashboard path, and Admin modules are visible
    await dashboardPage.assertOnDashboardPage();
    await dashboardPage.assertAdminMenuVisible();
  });
});
