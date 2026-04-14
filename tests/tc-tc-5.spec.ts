import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

class OrangeHrmLoginPageUi extends OrangeHrmLoginPage {
  // Extend existing POM strictly for UI assertions required by TC-TC-5.

  async assertUsernameVisible(): Promise<void> {
    await this.assertOnLoginPage();
  }

  async assertPasswordVisible(): Promise<void> {
    await this.assertOnLoginPage();
  }

  async assertPasswordInputTypeIsPassword(): Promise<void> {
    await this.assertPasswordInputHasTypePassword();
  }

  async typeSamplePasswordAndAssertTypeStillPassword(samplePassword: string): Promise<void> {
    await this.fillPassword(samplePassword);
    await this.assertPasswordInputHasTypePassword();
  }
}

test.describe('Login - UI elements and password masking (TC-TC-5)', () => {
  test('Login page shows username/password inputs and masks password input', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPageUi(page);

    // Arrange: Open the login page URL
    await loginPage.goto();

    // Act: No-op (this test validates UI and password masking)

    // Assert: Verify the username/password fields are visible and password masking is configured correctly
    await loginPage.assertOnLoginPage();
    await loginPage.assertUsernameVisible();
    await loginPage.assertPasswordVisible();
    await loginPage.assertPasswordInputTypeIsPassword();
    await loginPage.typeSamplePasswordAndAssertTypeStillPassword('SamplePassword123!');
  });
});
