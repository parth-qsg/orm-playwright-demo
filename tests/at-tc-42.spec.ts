import { expect, Locator, Page, test } from '@playwright/test';

function getBaseUrl(): string {
  const baseUrl = process.env.BASE_URL;
  test.skip(!baseUrl, 'Missing BASE_URL environment variable.');
  return baseUrl!.replace(/\/$/, '');
}

function uniqueEmail(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `pw.signup.${stamp}.w${worker}@example.test`;
}

function getSignupPassword(): string {
  // For signup we only need a password; do not hardcode secrets.
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
    return this.page.getByRole('button', { name: /sign up|signup|register|create account/i });
  }

  private get submitButton(): Locator {
    return this.page.getByRole('button', { name: /submit|continue/i });
  }

  async goto(): Promise<void> {
    const base = getBaseUrl();
    const candidates: string[] = [`${base}/signup`, `${base}/sign-up`, `${base}/register`, `${base}/auth/signup`];

    for (const url of candidates) {
      const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      if (response && response.status() !== 404) break;
    }

    await this.assertOnSignupPage();
  }

  async assertOnSignupPage(): Promise<void> {
    // Some apps redirect authenticated users away from signup.
    // If we can already see authenticated UI, treat this as success.
    const authenticatedMarker = this.page
      .getByRole('button', { name: /log out|logout|sign out/i })
      .or(this.page.getByRole('button', { name: /account|profile|user menu|menu/i }))
      .or(this.page.getByRole('heading', { name: /home|dashboard/i }));

    if (await authenticatedMarker.isVisible().catch(() => false)) return;

    const signupTab = this.page.getByRole('tab', { name: /sign up|signup|register|create account/i });
    if (await signupTab.isVisible().catch(() => false)) {
      await signupTab.click();
    }

    const formField = this.emailTextbox.or(this.usernameTextbox).or(this.passwordTextbox);
    await expect(formField.first()).toBeVisible({ timeout: 15000 });
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
    const button = (await this.signupButton.isVisible().catch(() => false)) ? this.signupButton : this.submitButton;
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();
  }
}

class AuthenticatedUi {
  constructor(private readonly page: Page) {}

  private get logoutButton(): Locator {
    return this.page.getByRole('button', { name: /log out|logout|sign out/i });
  }

  private get accountMenuButton(): Locator {
    return this.page.getByRole('button', { name: /account|profile|user menu|menu/i });
  }

  private get homeHeading(): Locator {
    return this.page.getByRole('heading', { name: /home|dashboard/i });
  }

  private get loginButtonOrLink(): Locator {
    return this.page
      .getByRole('button', { name: /log in|login|sign in/i })
      .or(this.page.getByRole('link', { name: /log in|login|sign in/i }));
  }

  async assertAuthenticated(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/(signup|sign-up|register|auth\/signup)(?:\?.*)?$/);
    await expect(this.logoutButton.or(this.accountMenuButton).or(this.homeHeading)).toBeVisible({ timeout: 20000 });
    await expect(this.loginButtonOrLink).toBeHidden();
  }
}

test.describe('AT-TC-42 - Verify user remains logged in after refreshing the page post-signup', {
  tag: ['@functional', '@regression'],
}, () => {
  test('User remains authenticated after page refresh post-signup', async ({ page }) => {
    // Arrange
    const signupPage = new SignupPage(page);
    const authenticatedUi = new AuthenticatedUi(page);

    const email = uniqueEmail();
    const password = getSignupPassword();

    // Act
    await signupPage.goto();
    await signupPage.fillMinimalRequiredDetails({ email, password });
    await signupPage.submit();

    // Assert
    await authenticatedUi.assertAuthenticated();

    // Act: refresh
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Assert: still authenticated
    await authenticatedUi.assertAuthenticated();
  });
});
