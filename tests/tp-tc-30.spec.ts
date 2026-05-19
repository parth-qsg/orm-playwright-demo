import { test } from '@playwright/test';
import { UserStoryCreatePage } from './user-story.page';

/**
 * TestCase ID: 933e232d-bf33-4748-99f8-9a8627637998
 * TestCase Key: TP-TC-30
 * Priority: medium
 * Objective: Prevent story creation when title is missing
 */

test.describe('TP-TC-30 - Prevent story creation when title is missing', () => {
  test('Saving a new story without a title is blocked and shows a validation error', async ({ page }) => {
    const userStoryCreatePage = new UserStoryCreatePage(page);

    // Arrange
    await userStoryCreatePage.goto();

    // Act
    await userStoryCreatePage.openAddUserStoryForm();
    await userStoryCreatePage.fillTitle('');
    await userStoryCreatePage.clickSave();

    // Assert
    await userStoryCreatePage.assertTitleValue('');
    await userStoryCreatePage.assertStoryNotCreated();

    // Validation message text varies by app; assert a visible error is shown.
    // Reuse existing validation assertion (covers alert/field-level error).
    await userStoryCreatePage.assertInvalidTitleValidationError();

    // Cleanup
    await userStoryCreatePage.closeForm();
  });
});
