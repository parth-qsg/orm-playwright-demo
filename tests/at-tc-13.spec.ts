import { test, expect, Locator, Page } from '@playwright/test';
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

  private get usernameFormatValidationText(): Locator {
    // Real-time username format validation message (app-specific).
    // Locator defined generically to align with the scenario expectation.
    return this.page.getByText(/invalid|format|email/i);
  }

  async typeUsername(username: string): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
    await expect(this.usernameTextbox).toBeEnabled();
    await this.usernameTextbox.fill('');
    await this.usernameTextbox.type(username);
  }

  async clearUsername(): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
    await this.usernameTextbox.clear();
  }

  async blurUsername(): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
    await this.usernameTextbox.blur();
  }

  async assertUsernameInvalidFormatInlineValidationVisible(): Promise<void> {
    await expect(this.usernameFormatValidationText).toBeVisible();
  }

  async assertUsernameValidFormatInlineValidationCleared(): Promise<void> {
    await expect(this.usernameFormatValidationText).toBeHidden();
  }
}

test.describe(
  'AT-TC-13 - Validate real-time username format validation during typing on login page',
  { tag: ['@functional', '@regression'] },
  () => {
    test('AT-TC-13 - Inline username format validation updates as user types', async ({ page }) => {
      const loginPage = new OrangeHrmLoginPage(page);

      // Arrange
      await loginPage.goto();
      await loginPage.assertOnLoginPage();

      // Act
      await loginPage.typeUsername('invalid');
      await loginPage.blurUsername();

      // Assert
      await loginPage.assertUsernameInvalidFormatInlineValidationVisible();

      // Act
      const validUsername = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
      if (!validUsername) {
        test.skip(true, 'Missing TEST_USERNAME (or APP_USERNAME) environment variable.');
      }

      await loginPage.clearUsername();
      await loginPage.typeUsername(validUsername);

      // Assert
      await loginPage.assertUsernameValidFormatInlineValidationCleared();
    });
  },
);
