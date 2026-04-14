import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

interface OrangeHrmTestCredentials {
  username: string;
  password: string;
}

function getOrangeHrmCredentials(): OrangeHrmTestCredentials {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
  const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

  if (!username) {
    throw new Error('Missing username env var. Set TEST_USERNAME or APP_USERNAME.');
  }

  if (!password) {
    throw new Error('Missing password env var. Set TEST_PASSWORD or APP_PASSWORD.');
  }

  return { username, password };
}

test.describe('Login - Username validation', () => {
  test('TC-TC-17: Submitting login with blank username shows Required validation and blocks submission', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const { password } = getOrangeHrmCredentials();

    // Arrange: Open login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act: Ensure username is blank, enter a valid password, click Login
    await loginPage.fillPassword(password);
    await loginPage.clickLogin();

    // Assert: Username required validation is displayed and user remains on login page
    await loginPage.assertUsernameRequiredVisible();
    await loginPage.assertOnLoginPage();
  });
});
