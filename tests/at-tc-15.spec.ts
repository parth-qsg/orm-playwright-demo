import { test, expect, Locator, Page } from '@playwright/test';

/**
 * AT-TC-15
 * Validate successful signup with all fields including referral.
 */

type SignupParams = {
  fullName: string;
  username: string;
  email: string;
  password: string;
  referralCode: string;
};

class BaseUiPage {
  constructor(protected readonly page: Page) {}

  protected async expectVisible(locator: Locator, name: string): Promise<void> {
    await expect(locator, `${name} should be visible`).toBeVisible();
  }
}

class SignupPage extends BaseUiPage {
  private get fullNameInput(): Locator {
    return this.page
      .getByLabel(/full name/i)
      .or(this.page.getByPlaceholder(/full name/i))
      .or(this.page.getByRole('textbox', { name: /full name/i }))
      .or(this.page.locator('input[name="fullName"], input[name="fullname"], input[id*="full" i]'));
  }

  private get usernameInput(): Locator {
    return this.page
      .getByLabel(/username/i)
      .or(this.page.getByPlaceholder(/username/i))
      .or(this.page.getByRole('textbox', { name: /username/i }))
      .or(this.page.locator('input[name="username"], input[id*="user" i]'));
  }

  private get emailInput(): Locator {
    return this.page
      .getByLabel(/email/i)
      .or(this.page.getByPlaceholder(/email/i))
      .or(this.page.getByRole('textbox', { name: /email/i }))
      .or(this.page.locator('input[type="email"], input[name="email"], input[id*="email" i]'));
  }

  private get passwordInput(): Locator {
    return this.page
      .getByLabel(/password/i)
      .or(this.page.getByRole('textbox', { name: /password/i }))
      .or(this.page.getByPlaceholder(/password/i));
  }

  private get referralCodeInput(): Locator {
    return this.page
      .getByLabel(/referral code|referral/i)
      .or(this.page.getByPlaceholder(/referral/i))
      .or(this.page.getByRole('textbox', { name: /referral code|referral/i }))
      .or(this.page.locator('input[name*="ref" i], input[id*="ref" i]'));
  }

  private get signUpButton(): Locator {
    // Some apps use "Sign Up" as a heading and "Create account" as the submit button,
    // or render the submit as <input type="submit">.
    return this.page
      .getByRole('button', { name: /sign up|sign-up|signup|create account|register|create an account/i })
      .or(this.page.getByRole('button', { name: /continue|submit/i }))
      .or(this.page.locator('button[type="submit"], input[type="submit"], [data-testid*="signup" i], [data-testid*="register" i]'));
  }

  async goto(): Promise<void> {
    await this.page.goto(process.env.SIGNUP_URL ?? '/signup');
  }

  async assertOnSignupPage(): Promise<void> {
    await expect(this.page).toHaveURL(/signup|register/i);

    // Prefer asserting on form fields first; some UIs only render/enable submit after validation.
    await this.expectVisible(this.fullNameInput, 'Full name input');
    await this.expectVisible(this.usernameInput, 'Username input');
    await this.expectVisible(this.emailInput, 'Email input');
    await this.expectVisible(this.passwordInput, 'Password input');
    await this.expectVisible(this.referralCodeInput, 'Referral code input');

    await expect(this.signUpButton, 'Sign up/submit control should exist on signup page').toHaveCount(1);
  }

  async fillAllFields(params: SignupParams): Promise<void> {
    await this.fullNameInput.fill(params.fullName);
    await expect(this.fullNameInput).toHaveValue(params.fullName);

    await this.usernameInput.fill(params.username);
    await expect(this.usernameInput).toHaveValue(params.username);

    await this.emailInput.fill(params.email);
    await expect(this.emailInput).toHaveValue(params.email);

    await this.passwordInput.fill(params.password);
    await expect(this.passwordInput).toHaveValue(params.password);

    await this.referralCodeInput.fill(params.referralCode);
    await expect(this.referralCodeInput).toHaveValue(params.referralCode);
  }

  async submit(): Promise<void> {
    await expect(this.signUpButton).toBeEnabled();
    await this.signUpButton.click();
  }
}

class HomePage extends BaseUiPage {
  private get main(): Locator {
    return this.page.getByRole('main');
  }

  private get logoutButton(): Locator {
    return this.page.getByRole('button', { name: /logout|log out|sign out/i });
  }

  private get accountLink(): Locator {
    return this.page.getByRole('link', { name: /account|profile|settings/i });
  }

  async assertRedirectedToHome(): Promise<void> {
    await expect(this.page).toHaveURL(/home|dashboard|app|\/$/i);
    await this.expectVisible(this.main, 'Home main landmark');
  }

  async assertAuthenticated(): Promise<void> {
    await this.expectVisible(this.logoutButton, 'Logout/Sign out button');
  }

  async openAccount(): Promise<void> {
    await this.expectVisible(this.accountLink, 'Account/Profile link');
    await this.accountLink.click();
  }
}

class AccountPage extends BaseUiPage {
  async assertReferralAssociationPersisted(referralCode: string): Promise<void> {
    await expect(this.page).toHaveURL(/account|profile|settings/i);

    await this.expectVisible(this.page.getByText(/referral code|referral/i), 'Referral label');

    const escaped = referralCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(this.page.getByText(new RegExp(escaped, 'i'))).toBeVisible();
  }
}

test.describe('AT-TC-15 - Validate successful signup with all fields including referral', { tag: ['@secure'] }, () => {
  test('AT-TC-15 - Signup with all fields including referral', async ({ page }) => {
    const signupPage = new SignupPage(page);
    const homePage = new HomePage(page);
    const accountPage = new AccountPage(page);

    // Arrange
    await signupPage.goto();
    await signupPage.assertOnSignupPage();

    const signupData: SignupParams = {
      fullName: 'All Fields Referral',
      username: 'refAll1',
      email: 'refall1@example.com',
      password: 'Str0ngP@ss!',
      referralCode: 'REF-ALL-999',
    };

    // Act
    await signupPage.fillAllFields(signupData);
    await signupPage.submit();

    // Assert
    await homePage.assertRedirectedToHome();
    await homePage.assertAuthenticated();

    await homePage.openAccount();
    await accountPage.assertReferralAssociationPersisted(signupData.referralCode);
  });
});
