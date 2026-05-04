import { test, expect, Locator, Page } from '@playwright/test';

/**
 * AT-TC-15
 * Validate successful signup with all fields including referral.
 *
 * NOTE (codebase constraints):
 * The standards require reusing POMs from /pages and helpers from /utils/helpers,
 * but file system access is restricted to /workspace/repo/tests only.
 * Therefore, this spec defines minimal local POMs to remain standards-compliant
 * (POM + AAA + role-based locators + assertions inside POM).
 *
 * NOTE (execution constraints):
 * Browser navigation to the AUT could not be completed in this environment due to missing/invalid baseURL/DNS.
 * Locators are implemented using resilient role/label patterns and an Element Recovery Rule helper.
 */

interface RetryVisibleParams {
  locator: Locator;
  locatorName: string;
}

interface SignupParams {
  fullName: string;
  username: string;
  email: string;
  password: string;
  referralCode: string;
}

class BaseUiPage {
  constructor(protected readonly page: Page) {}

  protected async retryExpectVisible({ locator, locatorName }: RetryVisibleParams): Promise<void> {
    const attempts = 3; // initial + 2 retries
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
        `Please confirm the correct accessible name/role for this element so the locator can be updated.\n` +
        `Last error: ${String(lastError)}`,
    );
  }
}

class SignupPage extends BaseUiPage {
  // Locators (getters)
  private get pageHeading(): Locator {
    return this.page.getByRole('heading', { name: /sign up|signup|create account|register/i }).first();
  }

  private get fullNameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /full name|name/i });
  }

  private get usernameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /username/i });
  }

  private get emailTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /email/i });
  }

  private get passwordTextbox(): Locator {
    // Prefer an accessible password textbox; many apps expose it as textbox with label 'Password'.
    return this.page.getByRole('textbox', { name: /password/i });
  }

  private get referralCodeTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /referral code|referral/i });
  }

  private get signUpButton(): Locator {
    return this.page.getByRole('button', { name: /sign up|signup|create account|register/i });
  }

  async goto(): Promise<void> {
    const signupUrl = process.env.SIGNUP_URL ?? '/signup';
    await this.page.goto(signupUrl);
  }

  async assertOnSignupPage(): Promise<void> {
    await expect(this.page).toHaveURL(/signup|register/i);

    // At least one strong signal the page is the signup page.
    await this.retryExpectVisible({ locator: this.pageHeading, locatorName: 'Signup page heading' });

    await this.retryExpectVisible({ locator: this.fullNameTextbox, locatorName: 'Full name textbox' });
    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await this.retryExpectVisible({ locator: this.emailTextbox, locatorName: 'Email textbox' });
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await this.retryExpectVisible({ locator: this.referralCodeTextbox, locatorName: 'Referral code textbox' });
    await this.retryExpectVisible({ locator: this.signUpButton, locatorName: 'Sign up button' });

    await expect(this.signUpButton).toBeEnabled();
  }

  async signup(params: SignupParams): Promise<void> {
    const { fullName, username, email, password, referralCode } = params;

    await this.retryExpectVisible({ locator: this.fullNameTextbox, locatorName: 'Full name textbox' });
    await this.fullNameTextbox.fill(fullName);

    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await this.usernameTextbox.fill(username);

    await this.retryExpectVisible({ locator: this.emailTextbox, locatorName: 'Email textbox' });
    await this.emailTextbox.fill(email);

    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await this.passwordTextbox.fill(password);

    await this.retryExpectVisible({ locator: this.referralCodeTextbox, locatorName: 'Referral code textbox' });
    await this.referralCodeTextbox.fill(referralCode);

    await this.retryExpectVisible({ locator: this.signUpButton, locatorName: 'Sign up button' });
    await expect(this.signUpButton).toBeEnabled();
    await this.signUpButton.click();
  }
}

class HomePage extends BaseUiPage {
  private get homeHeading(): Locator {
    return this.page.getByRole('heading', { name: /home|dashboard/i }).first();
  }

  private get logoutButton(): Locator {
    return this.page.getByRole('button', { name: /logout|log out|sign out/i });
  }

  private get userMenuButton(): Locator {
    return this.page.getByRole('button', { name: /account|profile|user menu|settings/i });
  }

  private get accountLink(): Locator {
    return this.page.getByRole('link', { name: /account|profile|settings/i });
  }

  async assertRedirectedToHome(): Promise<void> {
    await expect(this.page).toHaveURL(/home|dashboard|app|\/$/i);

    // Best-effort: many apps show either a heading or a main landmark.
    await this.retryExpectVisible({ locator: this.page.getByRole('main'), locatorName: 'Main landmark' });
  }

  async assertAuthenticated(): Promise<void> {
    // Try several common authenticated indicators.
    try {
      await this.retryExpectVisible({ locator: this.logoutButton, locatorName: 'Logout/Sign out button' });
      return;
    } catch {
      // fall through
    }

    try {
      await this.retryExpectVisible({ locator: this.userMenuButton, locatorName: 'User menu button' });
      return;
    } catch {
      // fall through
    }

    await this.retryExpectVisible({ locator: this.homeHeading, locatorName: 'Home/Dashboard heading' });
  }

  async openAccount(): Promise<void> {
    // Prefer a dedicated account link; otherwise open menu and then look for link.
    const accountLinkVisible = await this.accountLink.isVisible().catch(() => false);
    if (accountLinkVisible) {
      await expect(this.accountLink).toBeEnabled();
      await this.accountLink.click();
      return;
    }

    await this.retryExpectVisible({ locator: this.userMenuButton, locatorName: 'User menu button' });
    await expect(this.userMenuButton).toBeEnabled();
    await this.userMenuButton.click();

    await this.retryExpectVisible({ locator: this.accountLink, locatorName: 'Account/Profile/Settings link' });
    await expect(this.accountLink).toBeEnabled();
    await this.accountLink.click();
  }
}

class AccountPage extends BaseUiPage {
  private get referralSectionLabel(): Locator {
    return this.page.getByText(/referral code|referral/i).first();
  }

  async assertReferralAssociationPersisted(referralCode: string): Promise<void> {
    await expect(this.page).toHaveURL(/account|profile|settings/i);

    await this.retryExpectVisible({ locator: this.referralSectionLabel, locatorName: 'Referral code label/value' });
    await expect(this.page.getByText(new RegExp(referralCode, 'i'))).toBeVisible();
  }
}

test.describe(
  'AT-TC-15 - Validate successful signup with all fields including referral',
  { tag: ['@functional', '@regression', '@positive'] },
  () => {
    test('AT-TC-15 - Signup with full fields and referral completed; user authenticated with referral linked', async ({ page }) => {
      const signupPage = new SignupPage(page);
      const homePage = new HomePage(page);
      const accountPage = new AccountPage(page);

      // Arrange
      await signupPage.goto();
      await signupPage.assertOnSignupPage();

      // Act
      await signupPage.signup({
        fullName: 'All Fields Referral',
        username: 'refAll1',
        email: 'refall1@example.com',
        password: 'Str0ngP@ss!',
        referralCode: 'REF-ALL-999',
      });

      // Assert
      await homePage.assertRedirectedToHome();
      await homePage.assertAuthenticated();

      await homePage.openAccount();
      await accountPage.assertReferralAssociationPersisted('REF-ALL-999');
    });
  },
);
