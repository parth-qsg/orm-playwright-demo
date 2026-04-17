import { test } from '@playwright/test';
import { OrangeHrmLoginPage, type OrangeHrmCredentials } from './pages.orangehrm';

interface InvalidLoginTestData {
  username: string;
  invalidPassword: string;
}

function getInvalidLoginTestData(): InvalidLoginTestData {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME ?? '';
  const invalidPassword = process.env.TEST_INVALID_PASSWORD ?? process.env.APP_INVALID_PASSWORD ?? '';

  if (!username) {
    throw new Error(
      'Missing username environment variable. Set TEST_USERNAME (or APP_USERNAME) to run this test.',
    );
  }

  if (!invalidPassword) {
    throw new Error(
      'Missing invalid password environment variable. Set TEST_INVALID_PASSWORD (or APP_INVALID_PASSWORD) to run this test.',
    );
  }

  return { username, invalidPassword };
}

test.describe('Login - Invalid credentials', () => {
  test('TC-TC-24: Login fails with invalid Admin credentials shows error', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange: open login URL
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    const { username, invalidPassword } = getInvalidLoginTestData();
    const credentials: OrangeHrmCredentials = { username, password: invalidPassword };

    // Act: attempt login with invalid password
    await loginPage.loginExpectingFailure(credentials);

    // Assert: invalid credentials error shown and user remains on login page
    await loginPage.assertInvalidCredentialsErrorVisible();
    await loginPage.assertOnLoginPage();
  });
});
