import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-5 - Open Source HRM login page UI and password masking', () => {
  test('TC-TC-5 - Verify username/password fields are visible and password is masked', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange
    await loginPage.goto();

    // Act
    // (No additional actions beyond page load)

    // Assert
    await loginPage.assertOnLoginPage();
    await loginPage.assertUsernameTextboxVisible();
    await loginPage.assertPasswordTextboxVisible();
    await loginPage.assertPasswordInputIsMasked();
    await loginPage.assertPasswordInputRemainsMaskedAfterTyping('SamplePassword123!');
  });
});
