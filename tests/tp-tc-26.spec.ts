import { expect, Locator, Page, test } from '@playwright/test';

import { TpProductsDarkPage } from './tp-products-dark.page';

/**
 * TestCase ID: 56c34f4f-f5ad-407b-9e2c-c09b2200ff6a
 * TestCase Key: TP-TC-26
 * Priority: High
 * Type: UI, Functional
 * Objective: Verify the Products page shows correct metrics, headers, and a sample row
 */

class TpProductsDarkMetricsTablePage extends TpProductsDarkPage {
  constructor(page: Page) {
    super(page);
  }

  private get manageProductsSubheading(): Locator {
    return this.page.getByRole('heading', { name: /^manage products$/i });
  }

  private get productsTable(): Locator {
    return this.page.getByRole('table', { name: /products/i }).or(this.page.getByRole('table')).first();
  }

  private get headerRow(): Locator {
    return this.productsTable.getByRole('row').filter({ has: this.productsTable.getByRole('columnheader') }).first();
  }

  private rowByProductName(productName: string): Locator {
    // Prefer semantic row lookup by accessible name.
    return this.productsTable.getByRole('row', { name: new RegExp(productName, 'i') });
  }

  async assertSubheadingVisible(): Promise<void> {
    await expect(this.manageProductsSubheading).toBeVisible();
  }

  async assertTableHeaders(): Promise<void> {
    await expect(this.productsTable).toBeVisible();

    // Header text is case-sensitive in the testcase for "product Name".
    await expect(this.headerRow).toContainText('product Name');
    await expect(this.headerRow).toContainText('Sprints');
    await expect(this.headerRow).toContainText('Status');
  }

  async assertProductRow({ productName, sprints, status }: { productName: string; sprints: string; status: string }): Promise<void> {
    const row = this.rowByProductName(productName);
    await expect(row, `Row for product "${productName}" should exist`).toBeVisible();

    // Best-effort column assertions without relying on nth().
    await expect(row).toContainText(new RegExp(`\\b${this.escapeRegex(sprints)}\\b`));
    await expect(row).toContainText(new RegExp(`\\b${this.escapeRegex(status)}\\b`, 'i'));
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  }
}

test.describe('TP-TC-26 - Products page shows correct metrics, headers, and a sample row', () => {
  test('Dark-themed Products page UI aligns with design', async ({ page }) => {
    // Arrange
    const username: string | undefined = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password: string | undefined = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    test.skip(!username || !password, 'Missing credentials: set TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD).');

    const productsPage = new TpProductsDarkMetricsTablePage(page);

    // Act
    // Assumption: authenticated state is required; if the app uses storageState in config, this login may be unnecessary.
    // We keep this deterministic by attempting a direct navigation first; if redirected to login, the suite should provide storageState.
    await productsPage.goto();
    await productsPage.assertOnProductsPage();

    // Assert
    await productsPage.assertSubheadingVisible();
    await productsPage.assertMetrics({ productsText: '01 Products', activeText: '01 Active' });
    await productsPage.assertTableHeaders();
    await productsPage.assertProductRow({ productName: 'test Product', sprints: '01', status: 'Active' });
  });
});
