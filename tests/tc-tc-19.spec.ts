import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

class OrangeHrmLoginPageExtended extends OrangeHrmLoginPage {
  constructor(page: Parameters<typeof OrangeHrmLoginPage>[0]) {
    super(page);
  }

  // --- Locators (as getters) ---

  private get passwordTextboxFocused() {
    // Reuse the same accessible locator strategy as the base page.
    return this.page.getByRole('textbox', { name: 'Password' });
  }

  // --- Actions / Assertions ---

  async focusPassword(): Promise<void> {
    await this.assertPasswordTextboxVisible();
    await this.passwordTextboxFocused.click();
  }

  async assertPasswordFocused(): Promise<void> {
    await this.assertPasswordTextboxVisible();
    await this.passwordTextboxFocused.focus();
    await this.passwordTextboxFocused.evaluate((el) => {
      if (document.activeElement !== el) {
        throw new Error('Password textbox is not focused.');
      }
    });
  }

  async clearPassword(): Promise<void> {
    await this.assertPasswordTextboxVisible();
    await this.passwordTextboxFocused.clear();
  }

  async assertPasswordCleared(): Promise<void> {
    await this.assertPasswordTextboxVisible();
    await this.passwordTextboxFocused.evaluate((el) => {
      const input = el as HTMLInputElement;
      if (input.value !== '') {
        throw new Error(`Expected password textbox to be cleared, but value was: ${input.value}`);
      }
    });
  }
}

test.describe('TC-TC-19 - Verify password masking on the login page', () => {
  test('Password field masks input characters as the user types', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPageExtended(page);

    // Arrange: open login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act: focus password and type a sample password
    await loginPage.focusPassword();
    await loginPage.assertPasswordFocused();
    await loginPage.assertPasswordInputRemainsMaskedAfterTyping('TestPwd123');

    // Assert: clear password field
    await loginPage.clearPassword();
    await loginPage.assertPasswordCleared();
  });
});
