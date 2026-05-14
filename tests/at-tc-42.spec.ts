import { expect, Locator, Page, test } from '@playwright/test';

function getBaseUrl(): string {
  const baseUrl = process.env.BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL;
  test.skip(!baseUrl, 'Missing BASE_URL (or PLAYWRIGHT_BASE_URL) environment variable.');
  return baseUrl!.replace(/\/$/, '');
}

function uniqueEmail(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `pw.signup.${stamp}.w${worker}@example.test`;
}

function getSignupPassword(): string {
  // Never hardcode secrets; use env vars.
  const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
  test.skip(!password, 'Missing password: set TEST_PASSWORD (preferred) or APP_PASSWORD.');
  return password!;
}

class SignupPage {
  constructor(private readonly page: Page) {}

  private get emailTextbox(): Locator {
    return this.page
      .getByRole('textbox', { name: /email/i })
      .or(this.page.getByLabel(/email/i))
      .or(this.page.getByPlaceholder(/email/i))
      .or(
        this.page.locator(
          'input[name="email"], input#email, input[type="email"], input[autocomplete="email"], input[placeholder*="mail" i]',
        ),
      );
  }

  private get usernameTextbox(): Locator {
    return this.page
      .getByRole('textbox', { name: /username/i })
      .or(this.page.getByLabel(/username/i))
      .or(this.page.locator('input[name="username"], input#username, input[autocomplete="username"]'));
  }

  private get nameTextbox(): Locator {
    return this.page
      .getByRole('textbox', { name: /^name$/i })
      .or(this.page.getByLabel(/^name$/i))
      .or(this.page.locator('input[name="name"], input#name, input[autocomplete="name"]'));
  }

  private get passwordTextbox(): Locator {
    return this.page
      .getByLabel(/^password$/i)
      .or(this.page.getByPlaceholder(/^password$/i))
      .or(this.page.locator('input[name="password"], input#password, input[type="password"]'));
  }

  private get confirmPasswordTextbox(): Locator {
    return this.page
      .getByLabel(/confirm password|password confirmation/i)
      .or(this.page.getByPlaceholder(/confirm password|password confirmation/i))
      .or(
        this.page.locator(
          'input[name="confirmPassword"], input[name="confirm_password"], input#confirmPassword, input#confirm_password, input[autocomplete="new-password"]',
        ),
      );
  }

  private get signupButton(): Locator {
    return this.page
      .getByRole('button', { name: /sign up|signup|register|create account|create|submit|continue/i })
      .or(this.page.locator('button[type="submit"], input[type="submit"]'));
  }

  private get signupHeading(): Locator {
    return this.page.getByRole('heading', { name: /sign up|create account|register/i });
  }

  private get openSignupLinkOrButton(): Locator {
    return this.page
      .getByRole('link', { name: /sign up|signup|register|create account/i })
      .or(this.page.getByRole('button', { name: /sign up|signup|register|create account/i }));
  }

  async goto(): Promise<void> {
    const base = getBaseUrl();
    const candidates: string[] = [`${base}/signup`, `${base}/sign-up`, `${base}/register`, `${base}/auth/signup`];

    for (const url of candidates) {
      const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      if (response && response.status() !== 404) break;
    }

    if (!(await this.isOnSignupUi())) {
      await this.page.goto(base, { waitUntil: 'domcontentloaded' });
    }

    await this.assertOnSignupPage();
  }

  private async isOnSignupUi(): Promise<boolean> {
    const emailOrUser = this.emailTextbox.or(this.usernameTextbox);
    return (
      (await this.signupHeading.isVisible().catch(() => false)) ||
      (await emailOrUser.first().isVisible().catch(() => false))
    );
  }

  async assertOnSignupPage(): Promise<void> {
    const signupTab = this.page.getByRole('tab', { name: /sign up|signup|register|create account/i });
    if (await signupTab.isVisible().catch(() => false)) {
      await signupTab.click();
    }

    if (!(await this.isOnSignupUi())) {
      const opener = this.openSignupLinkOrButton;
      if (await opener.isVisible().catch(() => false)) {
        await opener.click();
      }
    }

    const emailOrUser = this.emailTextbox.or(this.usernameTextbox);
    await expect(this.signupHeading.or(emailOrUser).first()).toBeVisible({ timeout: 20000 });
  }

  async fillMinimalRequiredDetails(params: { email: string; password: string }): Promise<void> {
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
    const button = this.signupButton;
    if (await button.isVisible().catch(() => false)) {
      await expect(button).toBeEnabled();
      await button.click();
      return;
    }

    const form = this.page.locator('form');
    await expect(form.first()).toBeVisible({ timeout: 15000 });
    await form.first().evaluate((f) => (f as HTMLFormElement).requestSubmit());
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

  private get loginHeading(): Locator {
    return this.page.getByRole('heading', { name: /login|sign in/i });
  }

  private get loginUsernameField(): Locator {
    return this.page
      .getByRole('textbox', { name: /username|email/i })
      .or(this.page.getByLabel(/username|email/i))
      .or(
        this.page.locator(
          'input[name="username"], input[name="email"], input[type="email"], input[autocomplete="username"], input[autocomplete="email"]',
        ),
      );
  }

  private get signupHeading(): Locator {
    return this.page.getByRole('heading', { name: /sign up|create account|register/i });
  }

  private get signupEmailField(): Locator {
    return this.page
      .getByRole('textbox', { name: /email/i })
      .or(this.page.getByLabel(/email/i))
      .or(this.page.locator('input[name="email"], input#email, input[type="email"], input[autocomplete="email"]'));
  }

  private get loggedInUiHint(): Locator {
    return this.page.locator(
      '[data-testid*="user" i], [data-testid*="account" i], [data-testid*="logout" i], [aria-label*="account" i], [aria-label*="profile" i]',
    );
  }

  async assertLoggedIn(): Promise<void> {
    // Primary assertion for auth persistence: user should not be bounced back to auth screens.
    await expect(this.loginHeading, 'Login heading should not be visible when authenticated').toBeHidden({
      timeout: 20000,
    });
    await expect(this.loginUsernameField, 'Login username/email field should not be visible when authenticated').toBeHidden(
      { timeout: 20000 },
    );
    await expect(this.signupHeading, 'Signup heading should not be visible when authenticated').toBeHidden({
      timeout: 20000,
    });
    await expect(this.signupEmailField, 'Signup email field should not be visible when authenticated').toBeHidden({
      timeout: 20000,
    });

    // Secondary (best-effort) UI signal: if the app shows a user menu/logout, assert it.
    const positiveSignals = this.logoutButton.or(this.accountMenu).or(this.dashboardHeading).or(this.loggedInUiHint);
    if ((await positiveSignals.first().count()) > 0) {
      await expect(positiveSignals.first(), 'Logged-in UI signal should be visible when present').toBeVisible({
        timeout: 20000,
      });
    }
  }
}

test.describe('AT-TC-42 - Verify user remains logged in after refreshing the page post-signup', {
  tag: ['@functional', '@regression'],
}, () => {
  test('User remains authenticated after refresh post-signup', async ({ page }) => {
    // Arrange
    getBaseUrl();
    const email = uniqueEmail();
    const password = getSignupPassword();

    const signupPage = new SignupPage(page);
    const authed = new AuthenticatedUi(page);

    // Act
    await signupPage.goto();
    await signupPage.fillMinimalRequiredDetails({ email, password });
    await signupPage.submit();

    // Assert (post-signup)
    await authed.assertLoggedIn();

    // Act (refresh)
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Assert (still authenticated)
    await authed.assertLoggedIn();
  });
});
