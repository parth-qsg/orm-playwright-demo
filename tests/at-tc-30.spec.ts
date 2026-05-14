import { expect, Locator, Page, test } from '@playwright/test';

class SignupWithReferralPage {
  constructor(private readonly page: Page) {}

  private get nameTextbox(): Locator {
    return this.page
      .getByLabel(/^name$/i)
      .or(this.page.getByPlaceholder(/^name$/i))
      .or(this.page.getByRole('textbox', { name: /^name$/i }))
      .or(this.page.getByLabel(/full name/i))
      .or(this.page.getByPlaceholder(/full name/i));
  }

  private get emailTextbox(): Locator {
    return this.page
      .getByLabel(/email/i)
      .or(this.page.getByPlaceholder(/email/i))
      .or(this.page.getByRole('textbox', { name: /email/i }))
      .or(this.page.locator('input[type="email"]'))
      .or(this.page.locator('input[autocomplete="email"], input[autocomplete="username"]'))
      .or(this.page.locator('input[name*="email" i], input[id*="email" i]'))
      .or(this.page.locator('input[name*="user" i], input[id*="user" i]'));
  }

  private get passwordTextbox(): Locator {
    return this.page
      .getByLabel(/^password$/i)
      .or(this.page.getByPlaceholder(/^password$/i))
      .or(this.page.getByLabel(/password/i))
      .or(this.page.getByPlaceholder(/password/i))
      .or(this.page.locator('input[type="password"][autocomplete="new-password"], input[autocomplete="new-password"]'))
      .or(this.page.locator('input[type="password"]'));
  }

  private get confirmPasswordTextbox(): Locator {
    return this.page
      .getByLabel(/confirm password|password confirmation|re-enter password|repeat password/i)
      .or(this.page.getByPlaceholder(/confirm password|password confirmation|re-enter password|repeat password/i))
      .or(this.page.locator('input[name*="confirm" i][type="password"], input[id*="confirm" i][type="password"]'));
  }

  private get referralTextbox(): Locator {
    return this.page
      .getByLabel(/referral|referral code|invite code|promo code|promotion code/i)
      .or(this.page.getByPlaceholder(/referral|referral code|invite code|promo code|promotion code/i))
      .or(this.page.locator('input[name*="referral" i], input[id*="referral" i], input[name*="invite" i], input[id*="invite" i]'));
  }

  private get termsCheckbox(): Locator {
    return this.page
      .getByRole('checkbox', { name: /terms|conditions|privacy|i agree|agreement/i })
      .or(this.page.getByLabel(/terms|conditions|privacy|i agree|agreement/i));
  }

  private get submitButton(): Locator {
    return this.page.getByRole('button', { name: /sign up|signup|create account|register/i });
  }

  private get authenticatedMarker(): Locator {
    return this.page
      .getByRole('button', { name: /log out|logout|sign out/i })
      .or(this.page.getByRole('link', { name: /log out|logout|sign out/i }))
      .or(this.page.getByRole('button', { name: /account|profile|user|menu/i }))
      .or(this.page.locator('[data-testid*="avatar" i], [aria-label*="account" i], [aria-label*="profile" i]'));
  }

  private get accountSettingsLink(): Locator {
    return this.page
      .getByRole('link', { name: /profile|account|settings|my account/i })
      .or(this.page.getByRole('button', { name: /profile|account|settings|my account/i }));
  }

  private get userMenuTrigger(): Locator {
    return this.page
      .getByRole('button', { name: /account|profile|user|menu/i })
      .or(this.page.getByRole('link', { name: /account|profile/i }))
      .or(this.page.getByLabel(/account|profile|user menu/i))
      .or(this.page.locator('[aria-label*="account" i], [aria-label*="profile" i], [data-testid*="avatar" i]'));
  }

  async goto(): Promise<void> {
    const baseUrl = process.env.BASE_URL;
    test.skip(!baseUrl, 'Missing BASE_URL environment variable for UI tests.');

    const root = baseUrl.replace(/\/$/, '');

    await this.page.context().clearCookies();

    const candidates = [
      `${root}/signup`,
      `${root}/register`,
      `${root}/auth/signup`,
      `${root}/auth/register`,
      `${root}/sign-up`,
      `${root}/create-account`,
      `${root}/auth`,
      `${root}/login`,
    ];

    const formReady = async (): Promise<boolean> => {
      const emailCount = await this.emailTextbox.count().catch(() => 0);
      const passwordCount = await this.passwordTextbox.count().catch(() => 0);
      return emailCount > 0 && passwordCount > 0;
    };

    for (const url of candidates) {
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });

      const openSignupCta = this.page
        .getByRole('link', { name: /sign up|sign-up|signup|create account|register/i })
        .or(this.page.getByRole('button', { name: /sign up|sign-up|signup|create account|register/i }));
      if ((await openSignupCta.count().catch(() => 0)) > 0) {
        await openSignupCta.first().click().catch(() => undefined);
      }

      await this.page.waitForLoadState('domcontentloaded');

      // Some apps render signup inside an iframe (e.g., hosted auth). Detect and use it.
      const frames = this.page.frames();
      for (const frame of frames) {
        const emailInFrame = await frame
          .locator(
            'input[type="email"], input[autocomplete="email"], input[autocomplete="username"], input[name*="email" i], input[id*="email" i], input[name*="user" i], input[id*="user" i]',
          )
          .count()
          .catch(() => 0);
        const passwordInFrame = await frame.locator('input[type="password"], input[autocomplete="new-password"]').count().catch(() => 0);
        if (emailInFrame > 0 && passwordInFrame > 0) {
          await this.page.waitForTimeout(250);
          return;
        }
      }

      await this.page
        .waitForSelector(
          'input[type="email"], input[autocomplete="email"], input[autocomplete="username"], input[name*="email" i], input[id*="email" i], input[name*="user" i], input[id*="user" i]',
          {
            state: 'attached',
            timeout: 5000,
          },
        )
        .catch(() => undefined);

      if (await formReady()) return;
    }

    // Fallback: ensure we at least landed on a page that looks like auth/signup.
    await expect(
      this.page.getByRole('heading', { name: /sign up|create account|register/i }).or(
        this.page.getByText(/sign up|create account|register/i).first(),
      ),
    ).toBeVisible({ timeout: 15000 });
  }

  async assertSignupFormLoaded(): Promise<void> {
    // Support hosted auth flows that render the form inside an iframe.
    const frames = this.page.frames();
    for (const frame of frames) {
      const emailInFrame = await frame
        .locator(
          'input[type="email"], input[autocomplete="email"], input[autocomplete="username"], input[name*="email" i], input[id*="email" i], input[name*="user" i], input[id*="user" i]',
        )
        .count()
        .catch(() => 0);
      const passwordInFrame = await frame.locator('input[type="password"], input[autocomplete="new-password"]').count().catch(() => 0);
      if (emailInFrame > 0 && passwordInFrame > 0) return;
    }

    const emailVisible = await this.emailTextbox.first().isVisible().catch(() => false);
    if (!emailVisible) {
      await expect(this.page.getByRole('textbox').first()).toBeVisible();
    } else {
      await expect(this.emailTextbox.first()).toBeVisible();
    }

    await expect(this.passwordTextbox.first()).toBeVisible();
    await expect(this.submitButton).toBeVisible();

    await expect(this.page.locator('form, main')).toBeVisible();
  }

  async fillRequiredFields(params: { name: string; email: string; password: string }): Promise<void> {
    if ((await this.nameTextbox.count().catch(() => 0)) > 0) {
      await this.nameTextbox.first().fill(params.name);
    }
    await this.emailTextbox.first().fill(params.email);
    await this.passwordTextbox.first().fill(params.password);

    if ((await this.confirmPasswordTextbox.count().catch(() => 0)) > 0) {
      await this.confirmPasswordTextbox.first().fill(params.password);
    }
  }

  async fillReferralCode(code: string): Promise<void> {
    if ((await this.referralTextbox.count().catch(() => 0)) === 0) {
      const revealReferral = this.page
        .getByRole('button', { name: /referral|have a referral|invite code|promo code/i })
        .or(this.page.getByRole('link', { name: /referral|have a referral|invite code|promo code/i }));
      if ((await revealReferral.count().catch(() => 0)) > 0) {
        await revealReferral.first().click().catch(() => undefined);
      }
    }

    await expect(this.referralTextbox.first()).toBeVisible({ timeout: 15000 });
    await this.referralTextbox.first().fill(code);
  }

  async acceptTermsIfPresent(): Promise<void> {
    if ((await this.termsCheckbox.count().catch(() => 0)) > 0) {
      if (!(await this.termsCheckbox.first().isChecked().catch(() => false))) {
        await this.termsCheckbox.first().check({ force: true }).catch(async () => {
          await this.termsCheckbox.first().click({ force: true });
        });
      }
    }
  }

  async submit(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();
  }

  async assertRedirectedToHome(): Promise<void> {
    await expect(this.page).toHaveURL(/\/(home|dashboard)(\/|$)/i, { timeout: 20000 });
  }

  async assertAuthenticated(): Promise<void> {
    await expect(this.authenticatedMarker.first()).toBeVisible({ timeout: 20000 });
  }

  async openProfileOrAccountSettings(): Promise<void> {
    if ((await this.accountSettingsLink.count().catch(() => 0)) > 0) {
      await this.accountSettingsLink.first().click();
      await this.page.waitForLoadState('domcontentloaded');
      return;
    }

    if ((await this.userMenuTrigger.count().catch(() => 0)) > 0) {
      await this.userMenuTrigger.first().click().catch(() => undefined);
      if ((await this.accountSettingsLink.count().catch(() => 0)) > 0) {
        await this.accountSettingsLink.first().click();
        await this.page.waitForLoadState('domcontentloaded');
      }
    }
  }

  async assertReferralAssociationVisible(expectedCode: string): Promise<void> {
    const codeText = this.page.getByText(new RegExp(expectedCode, 'i')).first();
    if (await codeText.isVisible().catch(() => false)) {
      await expect(codeText).toBeVisible();
      return;
    }

    await this.openProfileOrAccountSettings();

    await expect(
      this.page.getByText(new RegExp(expectedCode, 'i')).first(),
      'Referral association should be visible in profile/account settings',
    ).toBeVisible({ timeout: 15000 });
  }
}

function uniqueEmail(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  return `pw.ref.${stamp}@example.test`;
}

test.describe(
  'AT-TC-30 - Successful signup with referral code and verify referral association, authenticated and redirected to Home',
  { tag: ['@functional', '@secure'] },
  () => {
    test('AT-TC-30 - Signup succeeds with referral code REF123 and user lands on Home authenticated', async ({ page }) => {
      const signup = new SignupWithReferralPage(page);

      // Arrange
      await signup.goto();
      await signup.assertSignupFormLoaded();

      const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
      test.skip(!password, 'Missing TEST_PASSWORD (or APP_PASSWORD) to create a new account.');

      const email = uniqueEmail();

      // Act
      await signup.fillRequiredFields({ name: 'Playwright User', email, password });
      await signup.fillReferralCode('REF123');
      await signup.acceptTermsIfPresent();
      await signup.submit();

      // Assert
      await signup.assertRedirectedToHome();
      await signup.assertAuthenticated();
      await signup.assertReferralAssociationVisible('REF123');
    });
  },
);
