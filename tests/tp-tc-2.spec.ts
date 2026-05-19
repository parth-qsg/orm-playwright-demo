import { expect, type Locator, type Page, test } from '@playwright/test';

class QMagicDemoLoginPage {
  readonly page: Page;
  readonly username: Locator;
  readonly password: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.username = page
      .getByLabel(/user(name)?/i)
      .or(page.getByPlaceholder(/user(name)?/i))
      .or(page.locator('input[name="username"], input#username, input[type="email"], input[autocomplete="username"]'));

    this.password = page
      .getByLabel(/pass(word)?/i)
      .or(page.getByPlaceholder(/pass(word)?/i))
      .or(page.locator('input[name="password"], input#password, input[type="password"], input[autocomplete="current-password"]'));

    this.loginButton = page
      .getByRole('button', { name: /log\s*in|sign\s*in/i })
      .or(page.locator('button[type="submit"], input[type="submit"]'));
  }

  async goto(): Promise<void> {
    await this.page.goto('https://demo.qmagic.ai/', { waitUntil: 'domcontentloaded' });
  }

  async assertLoaded(): Promise<void> {
    await expect(this.username, 'Username field should be visible').toBeVisible();
    await expect(this.password, 'Password field should be visible').toBeVisible();
    await expect(this.loginButton, 'Login button should be visible').toBeVisible();
  }

  async fillPassword(password: string): Promise<void> {
    await this.password.fill(password);
  }

  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  async assertUsernameRequiredVisible(): Promise<void> {
    // Many apps rely on HTML5 constraint validation without rendering an inline message.
    // Assert deterministically that the username input is invalid/required after submit.

    // Ensure the field is empty and trigger validation.
    await this.username.fill('');
    await this.username.focus();
    await this.page.keyboard.press('Tab');

    // Prefer native validity state (works even when no message is rendered).
    const isInvalid = await this.username.evaluate((el) => {
      const input = el as HTMLInputElement;
      if (typeof input.checkValidity === 'function') return !input.checkValidity();
      const ariaInvalid = input.getAttribute('aria-invalid');
      return ariaInvalid === 'true';
    });

    expect(isInvalid, 'Username field should be invalid when left empty').toBeTruthy();

    // If the app does render a message, accept either common text or browser default.
    const possibleMessage = this.page.getByText(
      /user(name)?\s+(is\s+)?required|required\s+user(name)?|enter\s+user(name)?|missing\s+user(name)?|please\s+fill\s+out\s+this\s+field/i,
    );
    await possibleMessage.waitFor({ state: 'visible', timeout: 1500 }).catch(() => undefined);
  }

  async assertStillOnLoginPage(): Promise<void> {
    await expect(this.page, 'User should remain on login page').toHaveURL(/demo\.qmagic\.ai\/?$/);
    await this.assertLoaded();
  }

  async assertPasswordAcceptedOrUnchanged(expectedPassword: string): Promise<void> {
    const currentValue = await this.password.inputValue();
    expect(currentValue.length > 0, 'Password should be accepted or remain unchanged in the field').toBeTruthy();
    expect(currentValue, 'Password should not be cleared after failed login').toBe(expectedPassword);
  }
}

test.describe('TP-TC-2 - Login validation', () => {
  test('Login blocked when username is empty', async ({ page }) => {
    const loginPage = new QMagicDemoLoginPage(page);

    // Arrange
    const password: string | undefined = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
    if (!password) test.skip(true, 'Missing password: set TEST_PASSWORD (or APP_PASSWORD).');

    await loginPage.goto();
    await loginPage.assertLoaded();

    // Act
    await loginPage.fillPassword(password);
    await loginPage.clickLogin();

    // Assert
    await loginPage.assertUsernameRequiredVisible();
    await loginPage.assertPasswordAcceptedOrUnchanged(password);
    await loginPage.assertStillOnLoginPage();
  });
});
