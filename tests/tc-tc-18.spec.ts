import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

interface UsernameParams {
  username: string;
}

class OrangeHrmLoginPageExtended extends OrangeHrmLoginPage {
  constructor(page: Parameters<typeof OrangeHrmLoginPage>[0]) {
    super(page);
  }

  // --- Locators (as getters) ---

  private get usernameTextboxExtended() {
    return this.page.getByRole('textbox', { name: 'Username' });
  }

  // --- Actions / Assertions ---

  async fillUsername({ username }: UsernameParams): Promise<void> {
    await this.assertUsernameTextboxVisible();
    await this.usernameTextboxExtended.fill(username);
  }

  async assertStillOnLoginPageAfterFailedSubmit(): Promise<void> {
    await this.assertOnLoginPage();
  }
}

test.describe('TC-TC-18 - Validate validation when password is blank', () => {
  test('Submitting login with blank password shows password-required validation and blocks submission', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPageExtended(page);

    // Arrange: Open the login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME ?? 'Admin';

    // Act: Enter username and submit with blank password
    await loginPage.fillUsername({ username });
    await loginPage.clickLogin();

    // Assert: Password required validation is displayed and login is not submitted
    await loginPage.assertPasswordRequiredVisible();
    await loginPage.assertStillOnLoginPageAfterFailedSubmit();
  });
});
