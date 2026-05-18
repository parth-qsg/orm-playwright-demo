import { expect, Locator, Page, test } from '@playwright/test';
import { OrangeHrmLoginPage as BaseOrangeHrmLoginPage } from './pages.orangehrm';

class OrangeHrmLoginPage extends BaseOrangeHrmLoginPage {
  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  private readonly page: Page;

  private get usernameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: 'Username' });
  }

  private get usernameFormGroup(): Locator {
    return this.page.locator('div.oxd-input-group').filter({ has: this.usernameTextbox });
  }

  private get usernameInlineValidation(): Locator {
    // OrangeHRM inline validation is typically rendered as a small text element under the input.
    // In some builds it may say "Required" rather than an explicit format error.
    return this.usernameFormGroup.locator('.oxd-input-field-error-message, .oxd-text--span');
  }

  async typeUsername(username: string): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
    await expect(this.usernameTextbox).toBeEnabled();
    await this.usernameTextbox.fill('');
    await this.usernameTextbox.type(username, { delay: 50 });
  }

  async blurUsername(): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
    await this.usernameTextbox.blur();
  }

  async assertUsernameInvalidFormatInlineValidationVisible(): Promise<void> {
    await expect(this.usernameInlineValidation).toBeVisible();
    await expect(this.usernameInlineValidation).toContainText(/required|invalid|format|email/i);
  }

  async assertUsernameValidFormatInlineValidationCleared(): Promise<void> {
    // When the username becomes acceptable, the inline error should disappear.
    // Some implementations remove the node; others keep it but clear the text.
    await expect(this.usernameInlineValidation).toHaveCount(0).catch(async () => {
      await expect(this.usernameInlineValidation).toBeHidden();
    });
  }
}

test.describe(
  'AT-TC-13 - Validate real-time username format validation during typing on login page',
  { tag: ['@functional'] },
  () => {
    test('AT-TC-13 - Inline username format validation updates as user types', async ({ page }) => {
      const loginPage = new OrangeHrmLoginPage(page);

      const validUsername = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
      test.skip(!validUsername, 'Missing TEST_USERNAME (or APP_USERNAME) environment variable.');

      // Arrange
      await loginPage.goto();
      await loginPage.assertOnLoginPage();

      // Act
      await loginPage.typeUsername('invalid');
      await loginPage.blurUsername();

      // Assert
      await loginPage.assertUsernameInvalidFormatInlineValidationVisible();

      // Act
      await loginPage.typeUsername(validUsername);

      // Assert
      await loginPage.assertUsernameValidFormatInlineValidationCleared();
    });
  },
);
