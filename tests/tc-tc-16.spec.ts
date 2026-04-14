import { test } from '@playwright/test';
import { OrangeHrmLoginPage, type OrangeHrmCredentials } from './pages.orangehrm';

test.describe('TC-TC-16 - Login failure with invalid credentials', () => {
  test('blocks login and shows invalid credentials error', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    const username: string = process.env.TEST_USERNAME ?? process.env.APP_USERNAME ?? '';
    const password: string = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD ?? '';

    if (!username || !password) {
      throw new Error(
        'Missing credentials env vars. Set TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD) to run this test.',
      );
    }

    const invalidCredentials: OrangeHrmCredentials = {
      username,
      // Avoid hardcoding passwords from testcase text; derive an invalid value from the valid env password.
      password: `${password}__invalid`,
    };

    // Arrange: Open the login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act: Attempt login with invalid credentials
    await loginPage.loginExpectingFailure(invalidCredentials);

    // Assert: Error is shown and user remains on login page
    await loginPage.assertInvalidCredentialsErrorVisible();
  });
});
