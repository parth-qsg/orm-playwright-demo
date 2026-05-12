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
  private get heading(): Locator {
    return this.page.getByRole('heading', { name: /sign up|signup|create account|register/i });
  }

  private get fullNameInput(): Locator {
    return this.page.getByRole('textbox', { name: /full name/i });
  }

  private get usernameInput(): Locator {
    return this.page.getByRole('textbox', { name: /username/i });
  }

  private get emailInput(): Locator {
    return this.page.getByRole('textbox', { name: /email/i });
  }

  private get passwordInput(): Locator {
    // Prefer label-based password field; fall back to common placeholder/name patterns.
    return this.page
      .getByLabel(/password/i)
      .or(this.page.getByRole('textbox', { name: /password/i }))
      .or(this.page.getByPlaceholder(/password/i));
  }

  private get referralCodeInput(): Locator {
    return this.page.getByRole('textbox', { name: /referral code|referral/i });
  }

  private get signUpButton(): Locator {
    return this.page.getByRole('button', { name: /sign up|signup|create account|register/i });
  }

  async goto(): Promise<void> {
    await this.page.goto(process.env.SIGNUP_URL ?? '/signup');
  }

  async assertOnSignupPage(): Promise<void> {
    // Some apps render signup without a heading or with non-semantic markup.
    // Assert using stable form controls instead of a heading.
    await expect(this.page).toHaveURL(/signup|register/i);

    await this.expectVisible(this.fullNameInput, 'Full name input');
    await this.expectVisible(this.usernameInput, 'Username input');
    await this.expectVisible(this.emailInput, 'Email input');
    await this.expectVisible(this.passwordInput, 'Password input');
    await this.expectVisible(this.referralCodeInput, 'Referral code input');
    await this.expectVisible(this.signUpButton, 'Sign up button');
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
    // Strongest common indicator.
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

    // Verify referral label exists and the code is displayed somewhere in the account area.
    await this.expectVisible(this.page.getByText(/referral code|referral/i), 'Referral label');
    await expect(this.page.getByText(new RegExp(referralCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))).toBeVisible();
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
