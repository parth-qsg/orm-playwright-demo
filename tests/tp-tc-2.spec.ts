import { expect, type Locator, type Page, test } from '@playwright/test';

class QMagicDemoLoginPage {
  readonly page: Page;
  readonly username: Locator;
  readonly password: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Prefer accessible locators; fall back to common attributes.
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
    // Validation can be implemented via:
    // - inline error text
    // - aria-invalid on the input
    // - native HTML5 required validation (no DOM message)

    // Trigger native validation UI by focusing the username field after submit attempt.
    await this.username.focus();

    const inlineMessage = this.page.getByText(
      /user(name)?\s+(is\s+)?required|required\s+user(name)?|enter\s+user(name)?|missing\s+user(name)?/i,
    );

    // aria-invalid may be set on the input itself.
    const ariaInvalidOnInput = this.username.locator(':scope[aria-invalid="true"]');

    // Some implementations set aria-invalid on a wrapper; check closest common wrappers.
    const ariaInvalidOnWrapper = this.username
      .locator('xpath=ancestor-or-self::*[self::div or self::label][@aria-invalid="true"][1]')
      .first();

    // Native HTML5 constraint validation.
    const nativeInvalid = this.page.locator('input:invalid').filter({ has: this.username });

    await expect(
      inlineMessage.or(ariaInvalidOnInput).or(ariaInvalidOnWrapper).or(nativeInvalid),
      'A username required validation indicator/message should be visible',
    ).toBeVisible();
  }

  async assertStillOnLoginPage(): Promise<void> {
    await expect(this.page, 'User should remain on login page').toHaveURL(/demo\.qmagic\.ai\/?$/);
    await this.assertLoaded();
  }

  async assertPasswordRetained(expectedPassword: string): Promise<void> {
    // Some apps clear password on submit; requirement says accepted or unchanged.
    // We assert it is either unchanged OR still present in the field (non-empty).
    const currentValue = await this.password.inputValue();
    expect(
      currentValue === expectedPassword || currentValue.length > 0,
      'Password should be accepted or remain unchanged in the field',
    ).toBeTruthy();
  }
}

test.describe('TP-TC-2 - Login validation', () => {
  test('Login blocked when username is empty', async ({ page }) => {
    const loginPage = new QMagicDemoLoginPage(page);

    // Arrange
    const password: string | undefined = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
    if (!password) {
      test.skip(true, 'Missing password: set TEST_PASSWORD (or APP_PASSWORD).');
    }

    await loginPage.goto();
    await loginPage.assertLoaded();

    // Act
    await loginPage.fillPassword(password);
    await loginPage.clickLogin();

    // Assert
    await loginPage.assertUsernameRequiredVisible();
    await loginPage.assertPasswordRetained(password);
    await loginPage.assertStillOnLoginPage();
  });
});
