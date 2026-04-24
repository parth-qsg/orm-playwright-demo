import { test, expect, type Locator, type Page } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

class OrangeHrmLoginValidationPage extends OrangeHrmLoginPage {
  constructor(private readonly validationPage: Page) {
    super(validationPage);
  }

  private get loginHeading(): Locator {
    return this.validationPage.getByRole('heading', { name: 'Login' });
  }

  async assertUsernameAndPasswordEmpty(): Promise<void> {
    const usernameTextbox = this.validationPage.getByRole('textbox', { name: 'Username' });
    const passwordTextbox = this.validationPage.getByRole('textbox', { name: 'Password' });

    await expect(usernameTextbox).toHaveValue('');
    await expect(passwordTextbox).toHaveValue('');
  }

  async blurByClickingHeading(): Promise<void> {
    await expect(this.loginHeading).toBeVisible();
    await this.loginHeading.click();
  }
}

test.describe(
  'AT-TC-9 - Login - Required field validations appear when username and password are empty',
  { tag: ['@functional', '@regression', '@high'] },
  () => {
    test('AT-TC-9 - Required messages are shown for Username and Password when left empty', async ({ page }) => {
      const loginPage = new OrangeHrmLoginValidationPage(page);

      // Arrange: Navigate to login page
      await loginPage.goto();
      await loginPage.assertOnLoginPage();

      // Act: Leave both fields empty and trigger validation (blur)
      await loginPage.blurByClickingHeading();
      await loginPage.assertUsernameAndPasswordEmpty();
      await loginPage.assertUsernameRequiredVisible();

      await loginPage.focusPassword();
      await loginPage.blurByClickingHeading();

      // Assert: Password required is displayed and user cannot proceed
      await loginPage.assertPasswordRequiredVisible();
    });
  },
);
