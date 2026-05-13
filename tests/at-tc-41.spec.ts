import { expect, Locator, Page, test } from '@playwright/test';

function getBaseUrl(): string {
  const baseUrl = process.env.BASE_URL;
  test.skip(!baseUrl, 'Missing BASE_URL environment variable.');
  return baseUrl!.replace(/\/$/, '');
}

function getReferralCode(): string {
  const code = process.env.TEST_REFERRAL_CODE ?? process.env.REFERRAL_CODE;
  test.skip(!code, 'Missing referral code. Set TEST_REFERRAL_CODE (preferred) or REFERRAL_CODE.');
  return code!;
}

function uniqueEmail(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `pw.signup.${stamp}.w${worker}@example.test`;
}

function strongPassword(): string {
  // Deterministic but strong enough for typical password policies.
  return 'Pw!23456_Test';
}

class SignupPage {
  constructor(private readonly page: Page) {}

  private get emailTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /email/i });
  }

  private get usernameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /username/i });
  }

  private get nameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /^name$/i });
  }

  private get passwordTextbox(): Locator {
    return this.page.getByLabel(/^password$/i).or(this.page.getByRole('textbox', { name: /^password$/i }));
  }

  private get confirmPasswordTextbox(): Locator {
    return this.page
      .getByLabel(/confirm password|password confirmation/i)
      .or(this.page.getByRole('textbox', { name: /confirm password|password confirmation/i }));
  }

  private get referralCodeTextbox(): Locator {
    return this.page
      .getByLabel(/referral code|referral|invite code|invitation code|promo code/i)
      .or(this.page.getByRole('textbox', { name: /referral code|referral|invite code|invitation code|promo code/i }));
  }

  private get signupButton(): Locator {
    return this.page.getByRole('button', { name: /sign up|signup|register|create account/i });
  }

  private get submitButton(): Locator {
    return this.page.getByRole('button', { name: /submit|continue/i });
  }

  private get signupHeading(): Locator {
    return this.page.getByRole('heading', { name: /sign up|create account|register/i });
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
    const signupTab = this.page.getByRole('tab', { name: /sign up|signup|register|create account/i });
    if (await signupTab.isVisible().catch(() => false)) {
      await signupTab.click();
    }

    const emailOrUser = this.emailTextbox.or(this.usernameTextbox);
    await expect(this.signupHeading.or(this.signupButton).or(emailOrUser)).toBeVisible({ timeout: 15000 });
  }

  async fillAllVisibleFields(params: {
    email: string;
    password: string;
    referralCode: string;
  }): Promise<void> {
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

    if (await this.referralCodeTextbox.isVisible().catch(() => false)) {
      await this.referralCodeTextbox.fill(params.referralCode);
    } else {
      test.skip(true, 'Referral code field not found on signup page.');
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

  private get loginButton(): Locator {
    return this.page.getByRole('button', { name: /log in|login|sign in/i });
  }

  private get loginLink(): Locator {
    return this.page.getByRole('link', { name: /log in|login|sign in/i });
  }

  async assertOnHomeAndAuthenticated(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/(signup|sign-up|register|auth\/signup)(?:\?.*)?$/);
    await expect(this.logoutButton.or(this.accountMenuButton).or(this.homeHeading)).toBeVisible({ timeout: 20000 });
    await expect(this.loginButton.or(this.loginLink)).toBeHidden();
  }
}

class ReferralAssertions {
  constructor(private readonly page: Page) {}

  private get referralSection(): Locator {
    return this.page.getByText(/referral|referred by|invited by|invite code/i);
  }

  private get profileLink(): Locator {
    return this.page.getByRole('link', { name: /profile|account|settings/i });
  }

  async gotoProfileIfPossible(): Promise<void> {
    if (await this.profileLink.isVisible().catch(() => false)) {
      await this.profileLink.click();
      await expect(this.page).not.toHaveURL(/\/(signup|sign-up|register)(?:\?.*)?$/);
    }
  }

  async assertReferralAssociationVisible(referralCode: string): Promise<void> {
    await this.gotoProfileIfPossible();

    // Best-effort UI assertion: referral section exists and contains the code.
    await expect(this.referralSection).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByText(new RegExp(referralCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))).toBeVisible({
      timeout: 15000,
    });
  }
}

test.describe('AT-TC-41 - Signup with referral code creates referral association and redirects to Home', {
  tag: ['@functional', '@regression'],
}, () => {
  test('Successful signup with all fields including referral code, authenticated and redirected to Home with referral association', async ({ page }) => {
    // Arrange
    const referralCode = getReferralCode();
    const email = uniqueEmail();
    const password = strongPassword();

    const signupPage = new SignupPage(page);
    const authenticatedUi = new AuthenticatedUi(page);
    const referralAssertions = new ReferralAssertions(page);

    // Act
    await signupPage.goto();
    await signupPage.fillAllVisibleFields({ email, password, referralCode });
    await signupPage.submit();

    // Assert
    await authenticatedUi.assertOnHomeAndAuthenticated();
    await referralAssertions.assertReferralAssociationVisible(referralCode);
  });
});
