import { test } from '@playwright/test';

import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TP-TC-1 - Login fails with invalid password for valid username', () => {
  test('Login is rejected; user remains on login page with an error notification', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange
    const username: string | undefined = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const validPassword: string | undefined = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    if (!username || !validPassword) {
      test.skip(true, 'Missing credentials: set TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD).');
    }

    const invalidPassword: string = `${validPassword}__invalid`;

    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act
    await loginPage.loginExpectingFailure({ username, password: invalidPassword });

    // Assert
    await loginPage.assertInvalidCredentialsErrorVisible();
    await loginPage.assertOnLoginPage();
  });
});
