import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

interface OrangeHrmAuthEnv {
  username: string;
}

function getAuthEnv(): OrangeHrmAuthEnv {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;

  if (!username) {
    throw new Error(
      'Missing username. Set TEST_USERNAME (preferred) or APP_USERNAME environment variables.',
    );
  }

  return { username };
}

test.describe(
  'AT-TC-10 - Login - Valid username with empty password is rejected',
  { tag: ['@functional', '@regression', '@high'] },
  () => {
    test('AT-TC-10 - Login fails and shows Password required when password is blank', async ({ page }) => {
      const loginPage = new OrangeHrmLoginPage(page);
      const { username } = getAuthEnv();

      // Arrange: user is on the login page
      await loginPage.goto();
      await loginPage.assertOnLoginPage();

      // Act: enter valid username, leave password blank, click Login
      await loginPage.fillUsername(username);
      await loginPage.clearPassword();
      await loginPage.clickLogin();

      // Assert: login is rejected with a clear "Required" message for password
      await loginPage.assertOnLoginPage();
      await loginPage.assertPasswordRequiredVisible();
    });
  },
);
