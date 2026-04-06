import { test } from '@playwright/test';
import { UserStoryCreatePage } from './user-story.page';

test.describe('TC-TC-1 - Create a new user story with only a Title', { tag: '@tag1' }, () => {
  test('TC-TC-1 - Save with required Title and no Description/Acceptance Criteria', async ({ page }) => {
    const createPage = new UserStoryCreatePage(page);

    // Arrange
    await createPage.goto();
    await createPage.openAddUserStoryForm();

    // Act
    await createPage.fillTitle('Improve search robustness');
    await createPage.clickSave();

    // Assert
    await createPage.assertTitleValue('Improve search robustness');
    await createPage.assertDescriptionEmpty();
    await createPage.assertAcceptanceCriteriaEmpty();
    await createPage.assertSaveSuccessMessageWithActions();
  });
});
