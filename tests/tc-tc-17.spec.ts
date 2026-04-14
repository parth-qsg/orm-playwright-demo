import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

interface PasswordParams {
  password: string;
}

class OrangeHrmLoginPageExtended extends OrangeHrmLoginPage {
  constructor(page: Parameters<typeof OrangeHrmLoginPage>[0]) {
    super(page);
  }

  async fillPasswordField({ password }: PasswordParams): Promise<void> {
    await this.assertPasswordTextboxVisible();
    await this.fillPassword(password);
  }

  async assertStillOnLoginPageAfterFailedSubmit(): Promise<void> {
    await this.assertOnLoginPage();
  }
}

test.describe('TC-TC-17 - Validate validation when username is blank', () => {
  test('Submitting login with blank username shows username-required validation and blocks submission', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPageExtended(page);

    // Arrange: Open the login page and ensure username is blank
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
    if (!password) {
      throw new Error(
        'Missing password env var. Set TEST_PASSWORD (preferred) or APP_PASSWORD to a valid password for this environment.',
      );
    }

    // Act: Enter password only and attempt to login
    await loginPage.fillPasswordField({ password });
    await loginPage.clickLogin();

    // Assert: Username required validation is displayed and login is not submitted
    await loginPage.assertUsernameRequiredVisible();
    await loginPage.assertStillOnLoginPageAfterFailedSubmit();
  });
});
