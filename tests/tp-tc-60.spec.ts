import { test } from "@playwright/test";
import { InstagramLoginPage } from "../pages/instagram-login.page";

test.describe(
  "TP-TC-60 Verify login with a disabled or non-existent account",
  { tag: "@tag 2" },
  () => {
    test(
      "@new rejects login for a non-existent account and shows an error",
      async ({ page }) => {
        const instagramLoginPage = new InstagramLoginPage(page);

        // Arrange
        await instagramLoginPage.goto();
        await instagramLoginPage.assertLoginPageIsDisplayed();

        // Act
        await instagramLoginPage.attemptLogin({
          username: "nonexistent_user_00000",
          password: "any_password_12345",
        });

        // Assert
        await instagramLoginPage.assertInvalidCredentialsErrorIsDisplayed();
        await instagramLoginPage.assertUserRemainsOnLoginPage();
      }
    );
  }
);
