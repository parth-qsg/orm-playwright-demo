import { test } from '@playwright/test';
import { OrangeHrmDashboardPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-22 - Auth - Direct dashboard access is blocked when not authenticated', () => {
  test('Unauthenticated dashboard navigation redirects to login; after login, dashboard is accessible', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const dashboardPage = new OrangeHrmDashboardPage(page);

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    test.skip(!username || !password, 'Missing credentials: set TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD).');

    // Arrange: Navigate directly to the dashboard URL without authentication
    await page.goto(
      process.env.ORANGEHRM_BASE_URL
        ? `${process.env.ORANGEHRM_BASE_URL}/web/index.php/dashboard/index`
        : 'https://opensource-demo.orangehrmlive.com/web/index.php/dashboard/index',
    );

    // Assert: User is redirected to the login page
    await loginPage.assertOnLoginPage();

    // Act: Log in with valid credentials
    await loginPage.fillUsername(username);
    await loginPage.fillPassword(password);
    await loginPage.clickLogin();

    // Assert: User is redirected to the dashboard and dashboard is displayed
    await dashboardPage.assertOnDashboardPage();
  });
});
