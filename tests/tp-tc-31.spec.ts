import { test } from '@playwright/test';
import { UserStoryCreatePage } from './user-story.page';

test.describe('TP-TC-31 - Story creation preview', () => {
  test('Preview shows the entered story title before saving', async ({ page }) => {
    const userStoryCreatePage = new UserStoryCreatePage(page);

    // Arrange
    await userStoryCreatePage.goto();

    // Act
    await userStoryCreatePage.openAddUserStoryForm();
    await userStoryCreatePage.fillTitle('test story 1 preview');

    // Assert
    await userStoryCreatePage.assertTitleValue('test story 1 preview');
    await userStoryCreatePage.assertPreviewTitle('test story 1 preview');

    // Cleanup
    await userStoryCreatePage.closeForm();
  });
});
