import { test } from '@playwright/test';
import { UserStoryCreatePage } from './user-story.page';

/**
 * TestCase ID: 0c32a400-8cfe-4e40-bc2f-069eb5901db7
 * TestCase Key: TP-TC-28
 * Priority: high
 * Objective: Reject story creation when title contains invalid characters
 */

test.describe('TP-TC-28 - Reject invalid characters in story title', () => {
  test('Invalid title input is rejected and no story is created', async ({ page }) => {
    const userStoryCreatePage = new UserStoryCreatePage(page);

    // Arrange
    await userStoryCreatePage.goto();

    // Act
    await userStoryCreatePage.openAddUserStoryForm();
    await userStoryCreatePage.fillTitle('<script>alert(1)</script>');
    await userStoryCreatePage.clickSave();

    // Assert
    await userStoryCreatePage.assertTitleValue('<script>alert(1)</script>');
    await userStoryCreatePage.assertInvalidTitleValidationError();
    await userStoryCreatePage.assertStoryNotCreated();

    // Cleanup
    await userStoryCreatePage.closeForm();
  });
});
