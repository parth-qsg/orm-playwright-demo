import { expect, Locator, Page, test } from '@playwright/test';

interface RetryVisibleParams {
  locator: Locator;
  locatorName: string;
}

interface TypePasswordParams {
  password: string;
}

class MagicAiLoginPage {
  constructor(private readonly page: Page) {}

  private get passwordTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /password/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('https://demo.magicai-app/login');
  }

  private async retryExpectVisible({ locator, locatorName }: RetryVisibleParams): Promise<void> {
    const attempts = 3; // initial + 2 retries (Element Recovery Rule)
    let lastError: unknown;

    for (let i = 0; i < attempts; i++) {
      try {
        await expect(locator).toBeVisible();
        return;
      } catch (err) {
        lastError = err;
        await this.page.waitForTimeout(250);
      }
    }

    await this.page.pause();
    throw new Error(
      `Element not found after ${attempts} attempts: ${locatorName}. ` +
        `Please confirm the correct role/name for this element so the locator can be updated.\n` +
        `Last error: ${String(lastError)}`,
    );
  }

  async assertPasswordFieldReady(): Promise<void> {
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await expect(this.passwordTextbox).toBeEnabled();
  }

  async typePassword({ password }: TypePasswordParams): Promise<void> {
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await this.passwordTextbox.fill(password);
  }

  async assertPasswordFieldTypeIsPassword(): Promise<void> {
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await expect(this.passwordTextbox).toHaveAttribute('type', 'password');
  }

  async assertPasswordNotShownInPlaintext({ password }: TypePasswordParams): Promise<void> {
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });

    const renderedText = await this.passwordTextbox.innerText().catch(() => '');
    expect(renderedText).not.toContain(password);

    const inputValue = await this.passwordTextbox.inputValue();
    expect(inputValue).toBe(password);
  }
}

test.describe('TC-TC-11 - Validate password masking as user types', () => {
  test('TC-TC-11 - Password input masks characters and is not shown in plaintext', async ({ page }) => {
    const loginPage = new MagicAiLoginPage(page);

    const passwordUnderTest = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    if (!passwordUnderTest) {
      throw new Error('Missing password env var. Set TEST_PASSWORD (preferred) or APP_PASSWORD.');
    }

    // Arrange
    await loginPage.goto();
    await loginPage.assertPasswordFieldReady();

    // Act
    await loginPage.typePassword({ password: passwordUnderTest });

    // Assert
    await loginPage.assertPasswordFieldTypeIsPassword();
    await loginPage.assertPasswordNotShownInPlaintext({ password: passwordUnderTest });
  });
});
