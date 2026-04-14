import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-7 - Invalid login attempt with incorrect credentials', () => {
  test('TC-TC-7 - System rejects login and shows an error for invalid credentials', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange
    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    if (!username) {
      throw new Error('Missing username. Set TEST_USERNAME (or APP_USERNAME).');
    }

    // Do not hardcode real credentials. Use a clearly-invalid password sourced from env when available.
    const invalidPassword = process.env.INVALID_PASSWORD ?? 'invalid-password';

    await test.step('Open the login page', async () => {
      await loginPage.goto();
    });

    await test.step('Verify login page is displayed', async () => {
      await loginPage.assertOnLoginPage();
    });

    // Act
    await test.step('Enter username and an incorrect password, then click Login', async () => {
      await loginPage.loginExpectingFailure({ username, password: invalidPassword });
    });

    // Assert
    await test.step('Verify invalid credentials error message is displayed', async () => {
      await loginPage.assertInvalidCredentialsErrorVisible();
    });
  });
});
