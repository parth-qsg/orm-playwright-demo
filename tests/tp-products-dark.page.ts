import { expect, Locator, Page } from '@playwright/test';

interface RetryVisibleParams {
  locator: Locator;
  locatorName: string;
}

interface ApplyStatusFilterParams {
  status: 'Active' | 'Inactive';
}

export class TpProductsDarkPage {
  constructor(private readonly page: Page) {}

  // --- Locators (getters only) ---

  private get productsHeading(): Locator {
    return this.page.getByRole('heading', { name: /^products$/i });
  }

  private get statusFilterCombobox(): Locator {
    return this.page.getByRole('combobox', { name: /^status$/i });
  }

  private get clearStatusFilterButton(): Locator {
    return this.page.getByRole('button', { name: /clear status|reset status|clear filter|reset filter/i });
  }

  private get productsMetric(): Locator {
    // Expected to display like "01 Products"
    return this.page.getByText(/^\d{2}\s+Products$/i);
  }

  private get activeMetric(): Locator {
    // Expected to display like "01 Active"
    return this.page.getByText(/^\d{2}\s+Active$/i);
  }

  private get productsTable(): Locator {
    return this.page.getByRole('table', { name: /products/i }).or(this.page.getByRole('table')).first();
  }

  private get tableRows(): Locator {
    // Exclude header row(s) by scoping to tbody when present.
    return this.productsTable.locator('tbody tr').or(this.productsTable.getByRole('row').filter({ hasNot: this.productsTable.getByRole('columnheader') }));
  }

  private get statusCells(): Locator {
    // Best-effort: try column header based approach in future; for now use cell text filter.
    return this.productsTable.getByRole('cell', { name: /^active$/i });
  }

  // --- Helpers ---

  private async retryExpectVisible({ locator, locatorName }: RetryVisibleParams): Promise<void> {
    const attempts = 3; // initial + 2 retries
    let lastError: unknown;

    for (let i = 0; i < attempts; i++) {
      try {
        await expect(locator).toBeVisible();
        return;
      } catch (err) {
        lastError = err;
        await this.page.waitForTimeout(250);
      }
    }

    await this.page.pause();
    throw new Error(
      `Element not found after ${attempts} attempts: ${locatorName}. ` +
        `Please confirm the correct role/name (accessible label) so the locator can be updated.\n` +
        `Last error: ${String(lastError)}`,
    );
  }

  // --- Navigation / Actions ---

  async goto(): Promise<void> {
    // Relies on Playwright config baseURL.
    await this.page.goto('/products');
  }

  async assertOnProductsPage(): Promise<void> {
    await this.retryExpectVisible({ locator: this.productsHeading, locatorName: 'Products heading' });
    await this.retryExpectVisible({ locator: this.productsTable, locatorName: 'Products table' });
  }

  async applyStatusFilter({ status }: ApplyStatusFilterParams): Promise<void> {
    await this.retryExpectVisible({ locator: this.statusFilterCombobox, locatorName: 'Status filter combobox' });
    await expect(this.statusFilterCombobox).toBeEnabled();
    await this.statusFilterCombobox.selectOption({ label: status });
  }

  async clearStatusFilter(): Promise<void> {
    // Prefer explicit clear button; fallback to selecting empty option.
    const clearVisible = await this.clearStatusFilterButton.isVisible().catch(() => false);

    if (clearVisible) {
      await expect(this.clearStatusFilterButton).toBeEnabled();
      await this.clearStatusFilterButton.click();
      return;
    }

    await this.retryExpectVisible({ locator: this.statusFilterCombobox, locatorName: 'Status filter combobox' });
    await expect(this.statusFilterCombobox).toBeEnabled();

    // Best-effort: common patterns.
    await this.statusFilterCombobox.selectOption({ label: 'All' }).catch(async () => {
      await this.statusFilterCombobox.selectOption({ label: 'Any' }).catch(async () => {
        await this.statusFilterCombobox.selectOption({ index: 0 });
      });
    });
  }

  // --- Assertions ---

  async assertMetrics({ productsText, activeText }: { productsText: string; activeText: string }): Promise<void> {
    await this.retryExpectVisible({ locator: this.productsMetric, locatorName: 'Products metric' });
    await this.retryExpectVisible({ locator: this.activeMetric, locatorName: 'Active metric' });

    await expect(this.productsMetric).toHaveText(productsText);
    await expect(this.activeMetric).toHaveText(activeText);
  }

  async assertAllVisibleRowsAreActive(): Promise<void> {
    await this.retryExpectVisible({ locator: this.productsTable, locatorName: 'Products table' });

    const rowCount = await this.tableRows.count();
    if (rowCount === 0) {
      await this.page.pause();
      throw new Error(
        'No visible product rows found after applying filter. Please confirm the table structure and whether products exist.',
      );
    }

    // Best-effort assertion: every row contains a cell with text Active.
    // Uses hasText to avoid inline locators in test file; still OK within POM.
    for (let i = 0; i < rowCount; i++) {
      const row = this.tableRows.nth(i);
      await expect(row, `Row ${i + 1} should show Active status`).toContainText(/\bactive\b/i);
    }
  }
}
