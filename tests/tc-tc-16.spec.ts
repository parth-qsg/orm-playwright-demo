import { test } from '@playwright/test';
import { OrangeHrmLoginPage, OrangeHrmCredentials } from './pages.orangehrm';

test.describe('TC-TC-16 - Login failure with invalid credentials', () => {
  test('blocks login with invalid password and shows invalid credentials error', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    const username: string = process.env.TEST_USERNAME ?? process.env.APP_USERNAME ?? '';
    const validPassword: string = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD ?? '';

    // Intentionally invalid password (derived from env so we never hardcode real credentials)
    const invalidPassword: string = validPassword ? `${validPassword}_invalid` : 'invalid_password';

    const credentials: OrangeHrmCredentials = {
      username: username || 'Admin',
      password: invalidPassword,
    };

    await loginPage.fillUsername(credentials.username);
    await loginPage.assertUsernameValue(credentials.username);

    await loginPage.fillPassword(credentials.password);
    await loginPage.assertPasswordValue(credentials.password);

    // Act
    await loginPage.clickLogin();

    // Assert
    await loginPage.assertOnLoginPage();
    await loginPage.assertInvalidCredentialsErrorVisible();
  });
});
