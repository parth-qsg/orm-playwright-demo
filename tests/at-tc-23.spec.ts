import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

interface OrangeHrmAuthEnv {
  username: string;
  password: string;
}

function getAuthEnv(): OrangeHrmAuthEnv {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
  const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Missing credentials: set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD environment variables.',
    );
  }

  return { username, password };
}

test.describe(
  'AT-TC-23 - Login security - Secure error messaging on incorrect password',
  { tag: ['@functional', '@security', '@high'] },
  () => {
    test('AT-TC-23 - Valid username + incorrect password fails with generic error messaging', async ({ page }) => {
      const loginPage = new OrangeHrmLoginPage(page);
      const { username, password } = getAuthEnv();

      // Arrange: Open the login page
      await loginPage.goto();
      await loginPage.assertOnLoginPage();

      // Act: Enter valid username and incorrect password, then attempt login
      await loginPage.fillUsername(username);
      await loginPage.fillPassword(`${password}-incorrect`);
      await loginPage.clickLogin();

      // Assert: Authentication fails with secure, non-revealing error messaging
      await loginPage.assertOnLoginPage();
      await loginPage.assertSecureInvalidCredentialsMessageVisible();
    });
  },
);
