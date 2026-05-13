import { expect, Locator, Page, test } from '@playwright/test';

class SignupPage {
  constructor(private readonly page: Page) {}

  private get emailTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /email/i });
  }

  private get passwordTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /^password$/i });
  }

  private get confirmPasswordTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /confirm password|password confirmation/i });
  }

  private get usernameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /username/i });
  }

  private get nameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /^name$/i });
  }

  private get signupButton(): Locator {
    return this.page.getByRole('button', { name: /sign up|signup|register|create account/i });
  }

  private get signupHeading(): Locator {
    return this.page.getByRole('heading', { name: /sign up|create account|register/i });
  }

  async goto(): Promise<void> {
    const baseURL = process.env.BASE_URL;
    test.skip(!baseURL, 'Missing BASE_URL environment variable.');

    const base = baseURL.replace(/\/$/, '');
    const candidates: string[] = [`${base}/signup`, `${base}/sign-up`, `${base}/register`, `${base}/auth/signup`];

    for (const url of candidates) {
      const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      // If server responds (even 200/3xx/401), proceed to check page content.
      if (response && response.status() !== 404) {
        break;
      }
    }

    await this.assertOnSignupPage();
  }

  async assertOnSignupPage(): Promise<void> {
    // Some apps render signup as a tab on a combined auth page.
    const signupTab = this.page.getByRole('tab', { name: /sign up|signup|register|create account/i });
    if (await signupTab.isVisible().catch(() => false)) {
      await signupTab.click();
    }

    // Best-effort: any of these should exist on a signup screen.
    const emailOrUser = this.emailTextbox.or(this.usernameTextbox);
    await expect(this.signupHeading.or(this.signupButton).or(emailOrUser)).toBeVisible({ timeout: 15000 });
  }

  async fillMinimalRequiredDetails(params: { email: string; password: string }): Promise<void> {
    // Fill only fields that exist/are visible.
    if (await this.emailTextbox.isVisible().catch(() => false)) {
      await this.emailTextbox.fill(params.email);
    }

    if (await this.usernameTextbox.isVisible().catch(() => false)) {
      await this.usernameTextbox.fill(params.email.split('@')[0]);
    }

    if (await this.nameTextbox.isVisible().catch(() => false)) {
      await this.nameTextbox.fill('Test User');
    }

    if (await this.passwordTextbox.isVisible().catch(() => false)) {
      await this.passwordTextbox.fill(params.password);
    }

    if (await this.confirmPasswordTextbox.isVisible().catch(() => false)) {
      await this.confirmPasswordTextbox.fill(params.password);
    }
  }

  async submit(): Promise<void> {
    await expect(this.signupButton).toBeVisible();
    await expect(this.signupButton).toBeEnabled();
    await this.signupButton.click();
  }
}

class AuthenticatedUi {
  constructor(private readonly page: Page) {}

  private get logoutButton(): Locator {
    return this.page.getByRole('button', { name: /log out|logout|sign out/i });
  }

  private get accountMenu(): Locator {
    return this.page.getByRole('button', { name: /account|profile|user menu|menu/i });
  }

  private get dashboardHeading(): Locator {
    return this.page.getByRole('heading', { name: /dashboard|home|my account|profile/i });
  }

  private get loginButton(): Locator {
    return this.page.getByRole('button', { name: /log in|login|sign in/i });
  }

  async assertLoggedIn(): Promise<void> {
    // Logged-in indicators: logout button OR account menu OR dashboard heading.
    await expect(this.logoutButton.or(this.accountMenu).or(this.dashboardHeading)).toBeVisible();

    // Negative signal: login button should not be visible (best-effort).
    await expect(this.loginButton).toBeHidden();
  }
}

test.describe('AT-TC-42 - Verify user remains logged in after refreshing the page post-signup', () => {
  test('User stays authenticated after page refresh', async ({ page }) => {
    const signupPage = new SignupPage(page);
    const authenticatedUi = new AuthenticatedUi(page);

    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
    test.skip(!password, 'Missing password: set TEST_PASSWORD (or APP_PASSWORD).');

    // Arrange
    await signupPage.goto();

    // Act
    const uniqueEmail = `pw-signup-${Date.now()}@example.test`;
    await signupPage.fillMinimalRequiredDetails({ email: uniqueEmail, password });
    await signupPage.submit();

    // Assert: user is authenticated after signup
    await authenticatedUi.assertLoggedIn();

    // Act: refresh
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Assert: user remains authenticated after refresh
    await authenticatedUi.assertLoggedIn();
  });
});
