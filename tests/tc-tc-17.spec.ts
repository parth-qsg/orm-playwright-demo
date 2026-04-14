import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Login validation', () => {
  test('TC-TC-17 - Validate validation when username is blank', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    const passwordFromEnv = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
    if (!passwordFromEnv) {
      throw new Error('Missing password env var. Set TEST_PASSWORD or APP_PASSWORD.');
    }

    // Arrange: open login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Ensure username is blank
    await loginPage.fillUsername('');
    await loginPage.assertUsernameCleared();

    // Enter a valid password (from env, not hardcoded)
    await loginPage.fillPassword(passwordFromEnv);

    // Act: attempt login
    await loginPage.clickLogin();

    // Assert: validation is shown and submission is blocked
    await loginPage.assertOnLoginPage();
    await loginPage.assertUsernameRequiredVisible();
  });
});
