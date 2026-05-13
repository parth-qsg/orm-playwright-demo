import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

interface AuthEnv {
  username: string;
  password: string;
}

function getAuthEnv(): AuthEnv {
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
  'AT-TC-23 - Secure error messaging on incorrect password',
  { tag: ['@functional', '@secure'] },
  () => {
    test('Authentication fails with secure, non-revealing error messaging', async ({ page }) => {
      const loginPage = new OrangeHrmLoginPage(page);
      const { username, password } = getAuthEnv();

      // Arrange
      await loginPage.goto();
      await loginPage.assertOnLoginPage();

      // Act
      await loginPage.fillUsername(username);
      await loginPage.fillPassword(`${password}-incorrect`);
      await loginPage.clickLogin();

      // Assert
      await loginPage.assertOnLoginPage();
      await loginPage.assertSecureInvalidCredentialsMessageVisible();
    });
  },
);
