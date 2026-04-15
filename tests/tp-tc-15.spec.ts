import { test } from '@playwright/test';
import { TpProductsDarkPage } from './tp-products-dark.page';

test.describe('TP-TC-15 - Products (dark theme) - Status filter', () => {
  test('Verify filtering by Active status narrows results and updates counts', async ({ page }) => {
    const productsPage = new TpProductsDarkPage(page);

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    test.skip(!username || !password, 'Missing credentials: set TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD).');

    // Arrange: open Products page (expects authenticated session via global setup)
    await productsPage.goto();
    await productsPage.assertOnProductsPage();

    // Act: apply Status = Active
    await productsPage.applyStatusFilter({ status: 'Active' });

    // Assert: all rows show Active and metrics update
    await productsPage.assertAllVisibleRowsAreActive();
    await productsPage.assertMetrics({ productsText: '01 Products', activeText: '01 Active' });

    // Act: clear filter
    await productsPage.clearStatusFilter();

    // Assert: metrics revert (per testcase expected)
    await productsPage.assertMetrics({ productsText: '01 Products', activeText: '01 Active' });
  });
});
