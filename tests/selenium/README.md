# E2E tests

This section contains end-to-end (e2e) tests related utilities. These tests have been included to simulate a real user scenarios to test the application.

- Refer to the [official docs](https://webdriver.io/docs/api) for the WebDriverIO.
- Refer to the [MediaWiki Selenium docs](https://www.mediawiki.org/wiki/Selenium).

## Getting started

### Setup
Refer to the [WikiLambda set-up docs](https://www.mediawiki.org/wiki/MediaWiki-Docker/Extension/WikiLambda).

### Pre-requesites

- Browsers: Ensure to have Chrome / Chromium installed on your computer.
- Environment variables: The `MW_SERVER` and `MW_SCRIPT_PATH` env variables are required. You may just source the `.env` file from the root of your mediawiki installation as below:

    ```bash
    source /path/to/mediawiki/.env
    ```

### Scripts

> Run all the commands from the root of the WikiLambda.

1. Run all the tests once using the following command:

    ```bash
    npm run selenium-test
    ```

2. Run specific test once using the following command:

    - Filter by file name:

        ```bash
        npm run selenium-test -- --spec tests/selenium/specs/[FILE-NAME]
        ```

    - Filter by file name and test name:

        ```bash
        npm run selenium-test -- --spec tests/selenium/specs/[FILE-NAME] --mochaOpts.grep [TEST-NAME]
        ```

3. Run all the tests multiple times (default 10 times) to check the stability of the tests using the following command:

    ```bash
    npm run browser-stress-test:all
    ```

    - Customize the number of times each test should run using the following command:

        ```bash
        npm run browser-stress-test:all -- --execution-number=[NUMBER-OF-TIMES]
        ```

4. Run specific test multiple times using the following command:

    ```bash
    npm run browser-stress-test -- --target-file=[FILE-NAME] --execution-number=[NUMBER-OF-TIMES]
    ```

## Test Structure and Customization

1. **`specs/`**: Contains tests to be executed.
    - `basic.js`: tests for installation checks.
    - `connect.js`: tests for [CUJ 6](https://phabricator.wikimedia.org/T318936).
    - `function.js`: tests for [CUJ 1](https://phabricator.wikimedia.org/T318922), [CUJ 2](https://phabricator.wikimedia.org/T318930), [CUJ 3](https://phabricator.wikimedia.org/T318933).
    - `implementations.js`: tests for [CUJ 5](https://phabricator.wikimedia.org/T318939)
    - `tester.js`: tests for [CUJ 4](https://phabricator.wikimedia.org/T318938).

2. **`utils/`**: Contains utility functions or helper modules that can be reused across the test suites.
    - `ElementActions.js`: Contains general actions that are performed on the browser elements.
    - `i18n.js`: Contains action for retrieving English string names.

3. **`wdio.conf.js`**: Contains the configuration for the tests.

4. **`pageobjects/`**: Contains specific page related selectors and actions.

    > Naming Convention:
    view mode: `<PageName>.page.js`
    edit mode: `<PageName>Form.page.js`

    - `function/`: Contains selectors and actions for the Function page.
    - `implementation/`: Contains selectors and actions for the Implementation page.
    - `tester/`: Contains selectors and actions for the Tester page.
    - `special/`: Contains selectors and actions for the Special pages.

5. **`componentobjects/`**: Contains components that are shared across multiple pages of the application.
    - `AboutBlock.js`: selectors and actions for the About block.
    - `ContentBlock.js`: selectors and actions for the Content block.
    - `EvaluateFunctionBlock.js`: selectors and actions for the Evaluate Function block.
    - `FunctionExplorerBlock.js`: selectors and actions for the Function Explorer block.
    - `InputDropdown.js`: selectors and actions for the Input Dropdown.
    - `ZObjectPublish.js`: selectors and actions for the ZObject Publish Flow.

## Maintaining the tests

- When many tests are failing simultaneously, try debugging the selectors in componentobjects as they are used in various pages so it is possible that tests break due to the UI changes in the componentobjects.
- If the tests are failing due to the UI changes in the specific page, then update the selectors in the respective pageobject.
- Placeholders, button labels, data-testid are part of some selectors. So, update the selectors accordingly when they are changed.