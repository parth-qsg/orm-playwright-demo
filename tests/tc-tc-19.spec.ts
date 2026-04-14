import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-19: Login - Password masking', () => {
  test('Verify password masking on the login page', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange: Open the login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act: Focus the password field and type a sample password
    const samplePassword = 'TestPwd123';
    await loginPage.assertPasswordInputRemainsMaskedAfterTyping(samplePassword);

    // Assert: Clear the password field
    await loginPage.fillPassword('');
  });
});
