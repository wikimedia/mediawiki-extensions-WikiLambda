# Selenium tests
For more information see https://www.mediawiki.org/wiki/Selenium

And the WebDriver API used here: https://webdriver.io/docs/api

## Setup
See https://www.mediawiki.org/wiki/MediaWiki-Docker/Extension/WikiLambda

## Pre-requesites

### Browsers

Ensure to have Chrome / Chromium installed on your computer.

### Environment variables

The `MW_SERVER` and `MW_SCRIPT_PATH` env variables are required. You may just source the `.env` file from the root of your mediawiki installation as above:

```bash
source /path/to/mediawiki/.env
```

## Run all specs

```bash
npm run selenium-test
```

## Run specific tests

Filter by file name:
```bash
npm run selenium-test -- --spec tests/selenium/specs/[FILE-NAME]
```

Filter by file name and test name:

```bash
npm run selenium-test -- --spec tests/selenium/specs/[FILE-NAME] --mochaOpts.grep [TEST-NAME]
```
