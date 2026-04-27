import { test } from '@playwright/test';
import { OrangeHrmDashboardPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-29 - Login', () => {
  test('Successful login with valid credentials redirects to dashboard', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const dashboardPage = new OrangeHrmDashboardPage(page);

    // Arrange
    const username: string = process.env.TEST_USERNAME ?? process.env.APP_USERNAME ?? '';
    const password: string = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD ?? '';

    test.skip(!username || !password, 'Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD).');

    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act
    await loginPage.fillUsername(username);
    await loginPage.fillPassword(password);
    await loginPage.clickLogin();

    // Assert
    await dashboardPage.assertOnDashboardPage();
  });
});
