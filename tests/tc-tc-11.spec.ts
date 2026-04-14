import { test } from '@playwright/test';

interface RetryExpectVisibleParams {
  locatorName: string;
}

interface TypePasswordParams {
  password: string;
}

class MagicAiLoginPage {
  constructor(private readonly page: import('@playwright/test').Page) {}

  // Locators (as getters)
  private get passwordInput(): import('@playwright/test').Locator {
    return this.page.getByLabel(/password/i);
  }

  // Navigation
  async goto(): Promise<void> {
    const baseUrl = process.env.BASE_URL;
    const fallbackUrl = process.env.MAGICAI_BASE_URL;

    if (!baseUrl && !fallbackUrl) {
      throw new Error('Missing BASE_URL env var (preferred) or MAGICAI_BASE_URL for navigation.');
    }

    const url = new URL('/login', baseUrl ?? fallbackUrl).toString();
    await this.page.goto(url);
  }

  // Element recovery rule (2 retries)
  private async retryAssertVisible({ locatorName }: RetryExpectVisibleParams): Promise<void> {
    const { expect } = await import('@playwright/test');

    const attempts = 3; // initial + 2 retries
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await expect(this.passwordInput, `${locatorName} should be visible`).toBeVisible();
        return;
      } catch (error) {
        lastError = error;
        // no hard wait; rely on auto-waiting and the next expect attempt
      }
    }

    await this.page.pause();
    throw new Error(
      `Element not found after ${attempts} attempts: ${locatorName}. ` +
        `Please point out the Password field so the locator can be corrected.\n` +
        `Last error: ${String(lastError)}`,
    );
  }

  // Actions
  async typePassword({ password }: TypePasswordParams): Promise<void> {
    await this.retryAssertVisible({ locatorName: 'Password input' });
    await this.passwordInput.fill(password);
  }

  // Assertions (must live in POM)
  async assertPasswordFieldReady(): Promise<void> {
    const { expect } = await import('@playwright/test');

    await this.retryAssertVisible({ locatorName: 'Password input' });
    await expect(this.passwordInput).toBeEnabled();
  }

  async assertPasswordFieldTypeIsPassword(): Promise<void> {
    const { expect } = await import('@playwright/test');

    await this.retryAssertVisible({ locatorName: 'Password input' });
    await expect(this.passwordInput).toHaveAttribute('type', 'password');
  }

  async assertPasswordNotRenderedAsPlaintext({ password }: TypePasswordParams): Promise<void> {
    const { expect } = await import('@playwright/test');

    await this.retryAssertVisible({ locatorName: 'Password input' });

    const renderedText = await this.passwordInput.innerText().catch(() => '');
    await expect(renderedText).not.toContain(password);
  }
}

test.describe('TC-TC-11 - Validate password masking as user types', () => {
  test('Password field masks characters while typing', async ({ page }) => {
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
    await loginPage.assertPasswordNotRenderedAsPlaintext({ password: passwordUnderTest });
  });
});
