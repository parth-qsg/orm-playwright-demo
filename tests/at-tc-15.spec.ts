import { test, expect, Locator, Page } from '@playwright/test';

/**
 * NOTE:
 * This testcase requires an application-under-test (AUT) that provides a Signup page
 * with a Referral Code field.
 *
 * Due to workspace file access restrictions, no existing app-specific page objects
 * (e.g., under /pages) can be inspected/reused here; therefore this spec defines
 * a local POM for the signup flow.
 */

interface SignupParams {
  fullName: string;
  username: string;
  email: string;
  password: string;
  referralCode: string;
}

class SignupPage {
  constructor(private readonly page: Page) {}

  // Locators (as getters)
  private get fullNameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /full name/i });
  }

  private get usernameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /^username$/i });
  }

  private get emailTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /email/i });
  }

  private get passwordTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /password/i });
  }

  private get referralCodeTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /referral code|referral/i });
  }

  private get signUpButton(): Locator {
    return this.page.getByRole('button', { name: /sign up|signup|create account|register/i });
  }

  // Actions / assertions
  async goto(): Promise<void> {
    // Prefer configured baseURL; fallback to SIGNUP_URL.
    const signupUrl = process.env.SIGNUP_URL ?? '/signup';
    await this.page.goto(signupUrl);
  }

  async assertOnSignupPage(): Promise<void> {
    await expect(this.page).toHaveURL(/signup/i);
    await expect(this.fullNameTextbox).toBeVisible();
    await expect(this.usernameTextbox).toBeVisible();
    await expect(this.emailTextbox).toBeVisible();
    await expect(this.passwordTextbox).toBeVisible();
    await expect(this.referralCodeTextbox).toBeVisible();
    await expect(this.signUpButton).toBeVisible();
  }

  async signup({ fullName, username, email, password, referralCode }: SignupParams): Promise<void> {
    await expect(this.fullNameTextbox).toBeVisible();
    await this.fullNameTextbox.fill(fullName);

    await expect(this.usernameTextbox).toBeVisible();
    await this.usernameTextbox.fill(username);

    await expect(this.emailTextbox).toBeVisible();
    await this.emailTextbox.fill(email);

    await expect(this.passwordTextbox).toBeVisible();
    await this.passwordTextbox.fill(password);

    await expect(this.referralCodeTextbox).toBeVisible();
    await this.referralCodeTextbox.fill(referralCode);

    await expect(this.signUpButton).toBeEnabled();
    await this.signUpButton.click();
  }
}

class HomePage {
  constructor(private readonly page: Page) {}

  private get authenticatedIndicator(): Locator {
    // Common patterns: Logout button, user menu, or profile avatar.
    return this.page.getByRole('button', { name: /logout|sign out/i });
  }

  private get accountLink(): Locator {
    return this.page.getByRole('link', { name: /account|profile|settings/i });
  }

  async assertOnHomePage(): Promise<void> {
    await expect(this.page).toHaveURL(/home|dashboard|app|\/$/i);
  }

  async assertAuthenticated(): Promise<void> {
    // If the AUT uses a different authenticated indicator, this locator will need adjustment.
    await expect(this.authenticatedIndicator).toBeVisible();
  }

  async openAccount(): Promise<void> {
    await expect(this.accountLink).toBeVisible();
    await expect(this.accountLink).toBeEnabled();
    await this.accountLink.click();
  }
}

class AccountPage {
  constructor(private readonly page: Page) {}

  private get referralCodeValue(): Locator {
    // Display label/value pattern.
    return this.page.getByText(/referral code/i);
  }

  async assertReferralAssociationPersisted(referralCode: string): Promise<void> {
    await expect(this.page).toHaveURL(/account|profile|settings/i);
    await expect(this.referralCodeValue).toBeVisible();
    await expect(this.page.getByText(new RegExp(referralCode, 'i'))).toBeVisible();
  }
}

test.describe(
  'AT-TC-15 - Validate successful signup with all fields including referral',
  { tag: ['@functional', '@regression', '@positive'] },
  () => {
    test('AT-TC-15 - Signup with full fields and referral completes and persists referral association', async ({ page }) => {
      const signupPage = new SignupPage(page);
      const homePage = new HomePage(page);
      const accountPage = new AccountPage(page);

      // Arrange
      // Preconditions: user not authenticated, signup accessible.
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
      await homePage.assertOnHomePage();
      await homePage.assertAuthenticated();

      // Assert (referral persisted)
      await homePage.openAccount();
      await accountPage.assertReferralAssociationPersisted('REF-ALL-999');
    });
  },
);
