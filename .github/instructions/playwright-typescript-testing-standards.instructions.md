---
description: "Playwright test generation instructions (TypeScript, POM, AAA)"
applyTo: "**"
---

## Test Writing Guidelines

### Code Quality Standards

- **Locators**: Prioritize user-facing, role-based locators (`getByRole`, `getByLabel`, `getByText`, etc.) for resilience and accessibility. Avoid raw selectors in test files — use Page Object Model methods instead.
- **Assertions**: Use auto-retrying web-first assertions. These assertions start with the `await` keyword (e.g., `await expect(locator).toHaveText()`). Avoid `expect(locator).toBeVisible()` unless specifically testing for visibility changes.
- **Timeouts**: Rely on Playwright's built-in auto-waiting mechanisms. Avoid hard-coded waits or increased default timeouts.
- **Clarity**: Use descriptive test and step titles that clearly state the intent. Add comments only to explain complex logic or non-obvious interactions.
- **Type Safety**:  
  - Avoid using `any`. All variables, test data, and function parameters **must have strict types**.  
  - Define types and interfaces in a dedicated `types` folder (e.g., `./types/user.types.ts`) and import them wherever needed.  
  - Example:
    ```ts
    // ./types/user.types.ts
    export interface USER {
      username: string;
      userId: number;
      isActive: boolean;
    }

    // Usage in test or helper
    import { USER } from '../types/user.types';

    const userData: USER = {
      username: 'John',
      userId: 1234,
      isActive: true
    };
    ```
  - This ensures test data is **strictly typed**, reusable, and easier to maintain.

### Test Structure

- **Imports**: Start with `import { test, expect } from '@playwright/test';`.
- **Organization**: Group related tests for a feature under a `test.describe()` block.
- **Hooks**: Use `beforeEach` for setup actions common to all tests in a `describe` block (e.g., navigating to a page).
- **Titles**: Follow a clear naming convention, such as `Feature - Specific action or scenario`.
- **AAA Pattern**: Write tests in three clear phases:
  - **Arrange**: Setup initial state (navigate, login, prepare data).
  - **Act**: Perform the user action under test.
  - **Assert**: Verify outcomes and expectations.

### Page Object Model (POM)

- **Page Classes**:
  - Each page or major component should be represented by a class inside the `pages/` directory.
  - Classes should contain locators and methods for user interactions or state verification and should follow SOLID principles.
  - Classes should be single-responsibility, focusing on one page or component.
  - Shared utilities should live in a `BasePage` class.
- **Naming**:
  - Files: `<feature-or-page>.page.ts` (e.g., `login.page.ts`, `search.page.ts`, `dashboard.page.ts`).
  - Classes: `<FeatureOrPage>Page` (e.g., `LoginPage`, `SearchPage`, `DashboardPage`).

### Environment Variables

- **Sensitive data (URLs, credentials, secrets)** must **not** be hardcoded in page objects or test files.
- Store them in a `.env` file and load them using the [`dotenv`](https://www.npmjs.com/package/dotenv) package.
- Example `.env` file:

```env
BASE_URL=https://debs-obrien.github.io/playwright-movies-app
TEST_USERNAME=testuser
TEST_PASSWORD=password123
```

- Example `playwright.config.ts` setup:

```typescript
import { defineConfig } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL,
  },
});
```

#### Example Page Class

```typescript
// pages/login.page.ts
import { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private get usernameInput(): Locator {
    return this.page.getByRole("textbox", { name: "Username" });
  }

  private get passwordInput(): Locator {
    return this.page.getByRole("textbox", { name: "Password" });
  }

  private get loginButton(): Locator {
    return this.page.getByRole("button", { name: "Login" });
  }

  async goto() {
    await this.page.goto(process.env.BASE_URL!);
  }

  async login(username: string = process.env.TEST_USERNAME!, password: string = process.env.TEST_PASSWORD!) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
```

```typescript
// pages/search.page.ts
import { Page, Locator, expect } from "@playwright/test";

export class SearchPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private get searchIcon(): Locator {
    return this.page.getByRole("search");
  }

  private get searchInput(): Locator {
    return this.page.getByRole("textbox", { name: "Search Input" });
  }

  private get searchResults(): Locator {
    return this.page.getByRole("main");
  }

  async searchMovie(title: string) {
    await this.searchIcon.click();
    await this.searchInput.fill(title);
    await this.searchInput.press("Enter");
  }

  async assertResultsContain(movieTitle: string) {
    await expect(this.searchResults).toContainText(movieTitle);
  }
}

```
---

### File Organization

* **Location**: Store all test files in the `tests/` directory and page classes in `pages/` and move sensitive data to environment variables.
* **Naming**: Use `<feature-or-page>.spec.ts` for tests and `<feature-or-page>.page.ts` for page objects.
* **Scope**: One test file per major feature or page.

### Assertion Best Practices

* **UI Structure**: Use `toMatchAriaSnapshot` to verify the accessibility tree structure of a component.
* **Element Counts**: Use `toHaveCount` to assert the number of elements found by a locator.
* **Text Content**: Use `toHaveText` for exact matches and `toContainText` for partial matches.
* **Navigation**: Use `toHaveURL` to verify the page URL after an action.

---

## Example Test (POM + AAA)

```typescript
import { test } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { SearchPage } from "../pages/search.page";

test.describe("Movie Search Feature", () => {
  test("Search for a movie by title", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const searchPage = new SearchPage(page);

    // Arrange: Go to app and log in
    await loginPage.goto();
    await loginPage.login();

    // Act: Search for a movie
    await searchPage.searchMovie("Garfield");

    // Assert: Verify results
    await searchPage.assertResultsContain("The Garfield Movie");
  });
});
```

---

### Constraints

- Use **Page Object Model (POM)**, no raw locators in test file.  
- Use **AAA (Arrange, Act, Assert)** structure in the test.  
- Use **role-based/user-facing locators** (`getByRole`, `getByLabel`, `getByText`) instead of raw CSS/XPath.  
- Store test data (username, password, employee details) in a **test data file** or fixture.  
- Use **web-first assertions** (e.g., `expect().toBeVisible()`).  
- Ensure **reusability** of login/logout methods across tests.

---

## Test Execution Strategy

1. **Initial Run**: Execute tests with `npx playwright test --project=chromium`
2. **Debug Failures**: Analyze failures and identify root causes
3. **Iterate**: Refine locators, assertions, or test logic as needed
4. **Validate**: Ensure tests pass consistently and cover intended functionality
5. **Report**: Provide feedback on test results and issues discovered

---

## Quality Checklist

Before finalizing tests, ensure:

* [ ] Tests import and use **Page Object Model** classes (no raw locators in test files)
* [ ] Tests follow **AAA structure** (Arrange → Act → Assert)
* [ ] All locators are accessible and specific, avoiding strict mode violations
* [ ] Tests are grouped logically and follow a clear structure
* [ ] Assertions are meaningful and reflect user expectations
* [ ] Naming conventions are consistent
* [ ] Code is properly formatted and commented

---
