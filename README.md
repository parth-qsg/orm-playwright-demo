# OrangeHRM tests playwright

## Getting started

-   Install node modules `npm install`
-   Install Playwright `npx playwright install`
-   Create environment variable files (see below 'Credentials')
-   `npm run test:demo` to run all tests

### Prerequisites

-   Node version `latest 20.x, 22.x or 24.x`.

## Configuration

-   Main configuration is in playwright.config.ts file. It contains settings for how tests are run, how many times retries, whether to retry them, etc.
-   It also contains projects. Projects in Playwright are categories for test running.
    -   We have `tests` project runs all tests on chrome browser.

## Credentials

-   To run tests on any environment, you need to create environment variable files in the root directory.
-   Use `example.env` file as example and fill in correct values for each environment. File name should correspond to the environment, e.g. 'demo.env', 'prod.env', etc.

## Tests

-   Tests folder contains all the tests. Add folders for different functionality to group related test files.

## Utils

-   This folder contains all helper files and functions.

## POM

-   Tests are written using Page Object Model (POM) pattern. Create separate pages and components for separate parts of the system and reuse them.
    -   Use a declarative approach for page objects, marking element selectors as private within each page class.
    -   Separate components within a page into distinct classes if they can be isolated, ensuring clear naming conventions for elements.
    -   All functions interacting with page elements should be public, with functional asserts and pre-action checks in separate methods.
    -   Follow a structured POM class format with global properties, a constructor, element getters, action functions, and assert functions.

## API requests

-   API requests are organized by feature for separation.
-   Use APIRequestContext methods to send various HTTP(S) requests over the network.
-   Data flows via factories and types

## How to run tests

-   Tests can be run on any environment. When running with npm script or via command line, you need to specify environment in which to run, e.g. `cross-env ENVIRONMENT=demo npx playwright test`
    > Environment has to come as the first thing in this command.
-   Tests can be run in headed and headless mode. You can set this option in configuration file or via the run command with `--headed` flag. By default headless mode is on.
    > e.g. `cross-env ENVIRONMENT=demo npx playwright test --headed`
-   You can run specific project, e.g. `cross-env ENVIRONMENT=demo npx playwright test --project=tests`.
-   You can run tests with specific tags, e.g. `cross-env ENVIRONMENT=demo TAGS=@smoke npx playwright test` or multiple tags `cross-env ENVIRONMENT=demo TAGS=\"@smoke|@regression\" npx playwright test`.

## Tagging tests

-   We use Playwright tag annotations to tag tests. They are added to the beggining of the test name with @, e.g. `@smoke @regression @user Test name is here`.
-   Tests should be tagged by their purpose: regression, smoke, e2e, functionality (use as many tags as needed).
-   To run filtered tests by tags, use one of the existing npm scripts or add/create a new one for your needs.

## Reports

-   Reports include all run tests, screenshots (if test failed), retries include video and trace.
-   To view report run command `npx playwright show-report`
-   Artifacts (screenshots, traces, videos) are saved in `test-results/`.

