# CLAUDE.md

Guidance for AI coding agents (Claude Code and similar) working in this
repository. The human-facing guide is imported below; everything in it
applies to you too.

@CONTRIBUTING.md

## Before you write code

* This is the core software behind Wikifunctions and Abstract Wikipedia.
  Every line is public and permanent, and every patch is reviewed by a
  person whose time is limited. Write for that reviewer.
* Follow [How we code](https://www.mediawiki.org/wiki/Abstract_Wikipedia/How_we_code)
  (summarised in CONTRIBUTING.md). In practice, for an agent, that means:
  * **Do the self-review the policy asks for.** Before you report a change
    as done, read the whole diff as a reviewer would. Remove dead code,
    debug output, speculative options and anything the task did not need
    (YAGNI).
  * **Reuse before you add.** Search for an existing helper, service or
    pattern (`ZObjectUtils`, the registries, `WikiLambdaServices`) before
    you write a new one. Do not copy a block of logic to a second place.
  * **Keep the diff minimal and atomic.** One logical change per commit.
    Do not reformat, rename or "tidy" unrelated code in the same patch.
  * **Keep comments short.** Comment the reason, not the mechanics. A
    comment must be much shorter than the code it describes; never narrate
    what the next line does, or refer to the task or the conversation.
  * **Prefer testable seams.** Inject config and services through the
    constructor or service wiring; do not read globals or `MediaWikiServices`
    deep inside logic, and do not reach into private state from tests.
  * **Use domain names.** Name variables for their role (`functionZid`,
    `testerResult`), not their type (`obj`, `arr`, `str`).
* If a requirement is unclear, or the clean fix needs a wider refactor than
  the task describes, stop and ask rather than guessing.

## Commit messages

* Subject is `component: Subject` (e.g. `ZObjectStore: Batch label lookups`);
  keep it short. The body explains the reason for the change in plain
  prose; do not use separate "Why:" / "What:" headings.
* Trailers, in this order, as one contiguous block at the very end, separated
  from the body by one blank line and with **no blank lines between them**:

  ```
  Assisted-by: <model name>
  Bug: T123456
  Change-Id: I…
  ```

  A blank line inside the block makes Git's trailer parser treat earlier
  trailers as body text, so `Bug:` stops linking on Phabricator and the
  `commit-msg` hook can put `Change-Id:` in the wrong place. Never write
  `Change-Id:` by hand on a new commit; keep the existing one when you amend.
  Do not use `Co-Authored-By:`.

## Feature modes

WikiLambda has independently toggled feature modes. See
[docs/CONTEXT.md](docs/CONTEXT.md) for the full vocabulary and the real-world
wiki profiles.

| Mode | Flag | Meaning |
|---|---|---|
| Repo | `$wgWikiLambdaEnableRepoMode` | Wiki stores ZObjects (wikifunctions.org). Only mode with a `ZObjectStore`. |
| Client | `$wgWikiLambdaEnableClientMode` | Wiki calls a remote repo via `{{#function:…}}` and `$wgWikiLambdaClientTargetAPI`. Modifier: `$wgWikiLambdaClientModeOffline`. |
| Abstract | `$wgWikiLambdaEnableAbstractMode` | Wiki hosts Abstract Wikipedia content (stored as ZObjects). Reshapes repo-mode behaviour. |
| Abstract Client | `$wgWikiLambdaEnableAbstractClientMode` | Wiki shows rendered abstract articles in place of missing local ones. Modifier: `$wgWikiLambdaEnableAbstractClientModeIntegration`. |

* Read modes through `WikiLambdaServices::getMode()` (`WikiLambdaMode`:
  `isRepo()`, `isClient()`, `isAbstract()`, `isAbstractClient()`,
  `isRepoOrAbstract()`, …). Do not add new raw `$config->get(
  'WikiLambdaEnable…' )` reads.
* For every behaviour change, decide which modes it affects and say so in
  the commit message. Abstract mode in particular can break normal repo-mode
  work in a local wiki; turn it off when you develop repo features.

## Build, lint and test commands

CI runs all of these; a failure in any one rejects the patch. For PHP changes,
run **both** `composer test` and `composer phan`. Do not use `php -l` as a
substitute; `composer test` already runs parallel-lint.

```bash
# JS/CSS, from this directory
npm run lint              # grunt: eslint + banana (i18n) + stylelint
npm run lint:fix
npm run test:unit         # Jest with coverage; floors in jest.config.js
npx jest path/to/file.test.js
npx jest -t "name of the test"
npm test                  # lint, then Jest

# PHP, from this directory
composer test             # parallel-lint + phpcs + minus-x
composer phan             # static analysis
composer phpcs path/to/file.php
composer fix              # phpcbf + minus-x fix

# PHPUnit, from the MediaWiki root, in a mediawiki-docker set-up
docker compose exec mediawiki composer phpunit:entrypoint extensions/WikiLambda/tests/phpunit/
```

* The banana check needs every message in `i18n/en.json` to have a
  documentation entry in `i18n/qqq.json`.
* Jest coverage floors are set per directory in `jest.config.js`; new code
  in `resources/ext.wikilambda.app/` must not drop coverage below them.

### In a wmf-claude sandbox

PHP and Composer exist only in the container, so prefix PHP commands with
`mwdocker` and run them from the MediaWiki root. Composer needs
`--working-dir`, or it runs core's scripts. Do **not** add a `--` separator:
`mwdocker` passes it through as a real argument and the call silently runs
the wrong thing.

```bash
mwdocker composer --working-dir=extensions/WikiLambda test
mwdocker composer --working-dir=extensions/WikiLambda phan
mwdocker vendor/bin/phpunit extensions/WikiLambda/tests/phpunit/
mwdocker vendor/bin/phpunit extensions/WikiLambda/tests/phpunit/integration/ActionAPI/ApiFunctionCallTest.php
```

The container has no `npm`; run Jest and ESLint on the host with
`node_modules/.bin/jest` and `node_modules/.bin/eslint`.

## Submodule: function-schemata

`function-schemata/` is a git submodule with the canonical JSON schemas and
built-in ZObject definitions (`function-schemata/data/definitions/`). These
are the source of truth for built-in objects, loaded by
`maintenance/loadPreDefinedObject.php`. Many PHPUnit and Jest failures come
from a stale submodule; run `git submodule update --init --recursive` first.

## Architecture

### PHP (`includes/`)

The PHP code follows the life of a ZObject: JSON → typed PHP objects → storage
→ APIs → orchestrator calls.

* **`ZObjects/`** — one class per ZType. `ZObject` is the base;
  `ZPersistentObject` is the `Z2` wrapper stored on a page.
* **`ZObjectFactory.php`** — turns JSON into the right `ZObject` subclass.
  Almost all external input goes through here.
* **`Registry/`** — in-memory registries for types, languages, errors and
  objects (`ZTypeRegistry`, `ZLangRegistry`, …).
* **`ZObjectStore.php`** — repo-mode DB layer for the secondary tables
  (labels, function references, language indexes).
* **`ZObjectContent/`** — the `ZObjectContent` / `ZObjectContentHandler`
  content model, page actions, and the secondary data updates triggered on
  save.
* **`AbstractContent/`** — the equivalent content model, actions and
  updates for Abstract Wikipedia articles (abstract mode).
* **`AWStorage/`**, **`ClientStorage/`** — stash-backed stores for rendered
  abstract articles and fragments, and for client-mode function-call
  results and usage.
* **`Diff/`** — ZObject revision diffs (`ZObjectDiffer`, visualiser, label
  resolution).
* **`ActionAPI/`** — `action=` modules (`ApiFunctionCall`,
  `ApiZObjectEditor`, `wikilambda*` query modules, abstract-wiki modules).
  **`RESTAPI/`** and **`PublicAPI/`** are the REST surfaces.
* **`OrchestratorRequest.php`** — calls the function-orchestrator at
  `$wgWikiLambdaOrchestratorLocation`.
* **`HookHandler/`** — all hook handlers, one class per concern (repo,
  client, page rendering, editing, abstract rendering, …). Look here when
  behaviour seems to "happen automatically" on edit or view.
* **`ParserFunction/`** — the Parsoid fragment handler for
  `{{#function:Zid|args…}}` (client mode). **`Renderer/`** sanitises and
  renders the returned HTML and image fragments.
* **`Authorization/`** — rule-based edit authorisation; the rules are in
  `authorization-rules.yml`.
* **`Jobs/`** — JobQueue work: tester result caching, implementation
  ranking, client fan-out and usage updates, abstract fragment caching.
* **`Special/`** — special pages (`CreateObject`, `RunFunction`,
  `ViewObject`, `CreateAbstract`, `ViewAbstract`, `PreviewAbstract`,
  `FunctionUsage`, the `List*` maintenance pages).
* **`ServiceWiring.php` / `WikiLambdaServices.php`** — service container.
  Get `ZObjectStore`, `WikiLambdaMode`, the orchestrator client and the
  authorisation service from here; do not construct them directly.

### Front-end (`resources/`)

* **`ext.wikilambda.app/`** — the main Vue 3 + Pinia app for viewing and
  editing ZObjects: `components/`, `views/`, `store/` (the state of an edit
  in progress), `composables/`, `utils/`, and `Constants.js`, which mirrors
  PHP `includes/defines.php` (keep the two in sync). Highest coverage floors.
* Other module directories (`abstractpreview`, `content`, `editpage`,
  `viewpage`, `functionLookup`, `itemLookup`, `image`, `languageselector`,
  `references`, `search`, `special`, `visualeditor`) are entry points,
  styles, or smaller apps. Some are registered in `extension.json`; others
  are registered or bundled from PHP (e.g. `ClientHooks` registers the
  VisualEditor module). Check both before you add or rename a module.
* Use Codex (`@wikimedia/codex`) components, not new custom widgets. State
  is Pinia, not Vuex.

### Tests (`tests/`)

* `tests/phpunit/{unit,integration,maintenance}/` mirror `includes/` and
  `maintenance/`. Integration tests need a database. Fixtures are in
  `tests/phpunit/test_data/`.
* `tests/jest/` has one directory per area (`components/`, `store/`,
  `composables/`, `abstractpreview/`, …). Mocks are in `tests/jest/helpers/`;
  ZObject fixtures in `tests/jest/fixtures/`. Global `mw.*` mocks are in
  `jest.setup.js` and `jest.setupAfterEnv.js`; add to them when a test fails
  on an undefined `mw.something`.
* `tests/selenium/` — WebdriverIO end-to-end tests and a `stress-test/`
  harness.

### Configuration surfaces

* **`extension.json`** — hooks, services, ResourceLoader modules, REST
  routes, special pages, content models and config variables. **Exception:**
  user rights and group permissions are registered from PHP in
  `RepoHooks::registerExtension()`, so they stay off client-only wikis
  (T423542). Do not move them into `extension.json`.
* **`authorization-rules.yml`** — first-match edit rules per ZObject path.
  Order matters: put the most specific rules first.
* **`bundlesize.config.json`** — JS bundle size budgets, enforced in CI.
  Check them when you add a dependency to a module.
