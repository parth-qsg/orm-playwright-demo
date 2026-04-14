import { test } from '@playwright/test';
import { OrangeHrmDashboardPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-8 - Admin login', () => {
  test('Successful login with valid admin credentials and verify admin access', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const dashboardPage = new OrangeHrmDashboardPage(page);

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act
    test.skip(!username || !password, 'Missing TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD) environment variables.');
    await loginPage.login(username!, password!);

    // Assert
    await dashboardPage.assertOnDashboardPage();
    await dashboardPage.assertAdminMenuVisible();
  });
});
