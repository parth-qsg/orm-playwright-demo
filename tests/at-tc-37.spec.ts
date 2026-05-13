import { expect, Locator, Page, test } from '@playwright/test';

class MinimalSignupPage {
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
      .or(this.page.locator('input[name*="email" i], input[id*="email" i]'));
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

  private get greetingText(): Locator {
    return this.page.getByText(/welcome|hi\b|hello\b|good (morning|afternoon|evening)/i);
  }

  async goto(): Promise<void> {
    const baseUrl = process.env.BASE_URL;
    test.skip(!baseUrl, 'Missing BASE_URL environment variable for UI tests.');

    const root = baseUrl.replace(/\/$/, '');

    // Preconditions: user is not authenticated.
    await this.page.context().clearCookies();
    await this.page.addInitScript(() => {
      try {
        localStorage.clear();
      } catch {
        // ignore
      }
      try {
        sessionStorage.clear();
      } catch {
        // ignore
      }
    });

    const candidates = [
      `${root}/signup`,
      `${root}/register`,
      `${root}/auth/signup`,
      `${root}/auth/register`,
      `${root}/sign-up`,
      `${root}/create-account`,
    ];

    for (const url of candidates) {
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });

      // If already authenticated, many apps redirect away from signup.
      // In that case, clear state and try next candidate.
      if (await this.authenticatedMarker.first().isVisible().catch(() => false)) {
        await this.page.context().clearCookies();
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      }

      // Some apps land on a generic auth page with a CTA to open the signup form.
      const openSignupCta = this.page
        .getByRole('link', { name: /sign up|sign-up|signup|create account|register/i })
        .or(this.page.getByRole('button', { name: /sign up|sign-up|signup|create account|register/i }));
      if ((await openSignupCta.count().catch(() => 0)) > 0) {
        await openSignupCta.first().click().catch(() => undefined);
      }

      // Wait for either email/password field or a signup heading to appear.
      await Promise.race([
        this.emailTextbox.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined),
        this.passwordTextbox.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined),
        this.page.getByRole('heading', { name: /sign up|signup|create account|register/i }).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined),
      ]);

      if (await this.emailTextbox.first().isVisible().catch(() => false)) return;
      if (await this.passwordTextbox.first().isVisible().catch(() => false)) return;

      // Some signup forms use inputs without accessible roles; fall back to input elements.
      const anyInput = this.page.locator('input').first();
      if (await anyInput.isVisible().catch(() => false)) return;
    }

    // Final fallback: ensure at least one input is present.
    await expect(this.page.locator('input').first()).toBeVisible({ timeout: 15000 });
  }

  async assertSignupPageDisplayed(): Promise<void> {
    const emailVisible = await this.emailTextbox.first().isVisible().catch(() => false);
    if (emailVisible) {
      await expect(this.emailTextbox.first()).toBeVisible();
    } else {
      await expect(this.page.getByRole('textbox').first()).toBeVisible();
    }
    await expect(this.passwordTextbox.first()).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async fillMinimalRequiredFields(params: { email: string; password: string }): Promise<void> {
    // Only fill name if it exists; testcase requires minimal payload.
    if ((await this.nameTextbox.count().catch(() => 0)) > 0) {
      // Leave blank intentionally.
    }

    await this.emailTextbox.first().fill(params.email);
    await this.passwordTextbox.first().fill(params.password);

    if ((await this.confirmPasswordTextbox.count().catch(() => 0)) > 0) {
      await this.confirmPasswordTextbox.first().fill(params.password);
    }
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

  async assertAuthenticatedSessionEstablished(): Promise<void> {
    // UI marker
    await expect(this.authenticatedMarker.first()).toBeVisible({ timeout: 20000 });

    // Best-effort token/session check (implementation varies by app).
    const hasAuthArtifact = await this.page.evaluate(() => {
      const cookieNames = document.cookie
        .split(';')
        .map((c) => c.trim().split('=')[0])
        .filter(Boolean);

      const cookieHit = cookieNames.some((n) => /auth|token|session|jwt/i.test(n));

      const storageKeys: string[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) storageKeys.push(localStorage.key(i) ?? '');
      } catch {
        // ignore
      }
      try {
        for (let i = 0; i < sessionStorage.length; i++) storageKeys.push(sessionStorage.key(i) ?? '');
      } catch {
        // ignore
      }

      const storageHit = storageKeys.some((k) => /auth|token|session|jwt/i.test(k));
      return cookieHit || storageHit;
    });

    expect(hasAuthArtifact, 'Auth cookie or storage token/session key should exist').toBeTruthy();
  }

  async assertHomeShowsLoggedInUi(): Promise<void> {
    // Either a greeting text or an authenticated marker should be visible.
    const greetingVisible = await this.greetingText.first().isVisible().catch(() => false);
    if (greetingVisible) {
      await expect(this.greetingText.first()).toBeVisible();
      return;
    }

    await expect(this.authenticatedMarker.first()).toBeVisible();
  }
}

function uniqueEmail(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  return `pw.min.${stamp}@example.test`;
}

test.describe('AT-TC-37 - Signup with minimal payload redirects to Home and authenticates the user', () => {
  test('AT-TC-37 - Minimal signup redirects to Home and establishes authenticated session', async ({ page }) => {
    const signup = new MinimalSignupPage(page);

    // Arrange
    await signup.goto();
    await signup.assertSignupPageDisplayed();

    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
    test.skip(!password, 'Missing TEST_PASSWORD (or APP_PASSWORD) to create a new account.');

    const email = process.env.TEST_USERNAME ?? process.env.APP_USERNAME ?? uniqueEmail();

    // Act
    await signup.fillMinimalRequiredFields({ email, password });
    await signup.acceptTermsIfPresent();
    await signup.submit();

    // Assert
    await signup.assertRedirectedToHome();
    await signup.assertAuthenticatedSessionEstablished();
    await signup.assertHomeShowsLoggedInUi();
  });
});
