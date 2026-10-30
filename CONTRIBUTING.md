# Contributing to WikiLambda

WikiLambda is the MediaWiki extension behind [Wikifunctions](https://www.wikifunctions.org/)
and Abstract Wikipedia. Thank you for helping. This page covers how we work
and what we look for in a patch.

## Where things happen

* **Code review** is on [Gerrit](https://gerrit.wikimedia.org/r/q/project:mediawiki/extensions/WikiLambda).
  See [Gerrit/Tutorial](https://www.mediawiki.org/wiki/Gerrit/Tutorial) if you are new to it.
* **Tasks and bugs** are on [Phabricator](https://phabricator.wikimedia.org/tag/abstract_wikipedia_team/).
  Please find or file a task before starting non-trivial work, so we can agree
  on the approach before you write the code.
* **Setup**, data loading and back-end services are documented in [README.md](README.md).
* **Domain vocabulary** (feature modes, repo/client/abstract wikis) is in
  [docs/CONTEXT.md](docs/CONTEXT.md).

## How we code

We follow the team policy at
[Abstract Wikipedia/How we code](https://www.mediawiki.org/wiki/Abstract_Wikipedia/How_we_code).
Please read it; it is short. It applies equally to hand-written and
LLM-assisted code. The key points:

* **Aim for readable, maintainable, testable code.** Someone with the right
  domain knowledge should be able to understand the code in one read, change
  it without touching many unrelated places, and test it without hacks such as
  poking private state or changing globals.
* **Review your own patch first.** Before you ask for review, read your diff
  as the reviewer would, or as you will three months from now. If the logic is
  hard to follow, fix the code, not the reviewer.
* **Watch for code smells.** Most come down to "Does X really need to know
  about Y?" and "Are there side effects?" Hide complexity behind the API that
  owns it, rather than making every caller manage it. Inject dependencies such
  as configuration or the environment, rather than reading global state.
* **Name things for what they mean.** `obj`, `x` and `str` tell the reader
  nothing; a name should hint at the role the value plays.
* **DRY, KISS, YAGNI — as principles, not laws.** Keep one source of truth,
  but not all duplicated code is duplicated knowledge. Choose the simpler of
  two equal solutions; extra complexity needs to buy correctness, speed, or
  maintainability. Build what is needed now, not what might be needed later.
* **Comments explain intent, briefly.** A comment should be much shorter than
  the code it describes, and use the words of the problem domain rather than
  vague jargon ("handler", "limit"). If comments approach the length of the
  code, the code itself needs to be clearer.

## What we look for in a patch

* **One logical change per commit.** Small, focused patches are faster to
  review and safer to revert. Split refactors from behaviour changes.
* **Tests.** New behaviour and bug fixes come with tests at the right level
  (PHPUnit unit or integration tests; Jest for front-end code).
* **All four feature modes considered.** Repo, client, abstract, and abstract
  client modes each change behaviour in many code paths; say in the commit
  message which ones your change affects.
* **A clear commit message.** Use a `component: Subject` subject line, explain
  the reason for the change in the body, and link the task:

  ```
  ZObjectStore: Batch label lookups for function lists

  Body text explaining the reason for the change and anything a reviewer
  needs to know.

  Bug: T123456
  Change-Id: I…
  ```

  Trailers form one block at the end, with no blank lines between them.
  `Change-Id:` is added by the Gerrit `commit-msg` hook. If an AI tool helped
  write the patch, add an `Assisted-by:` trailer naming the model, before
  `Bug:`. See [the evolving guidance](https://www.mediawiki.org/wiki/Using_AI_in_MediaWiki_patches)
  for more on use of AI tooling.

## Running the checks

CI runs all of these; please run them before you upload.

```bash
# From this directory
npm ci
npm test                  # ESLint, Stylelint, banana i18n check, then Jest
npm run lint:fix          # auto-fix JS/CSS lint

composer install
composer test             # parallel-lint, phpcs, minus-x
composer phan             # static analysis
composer fix              # auto-fix phpcs and minus-x

# From the MediaWiki root, in a mediawiki-docker set-up
docker compose exec mediawiki composer phpunit:entrypoint extensions/WikiLambda/tests/phpunit/
```

Jest coverage floors (in `jest.config.js`) and ResourceLoader bundle size
budgets (in `bundlesize.config.json`) are enforced in CI.

## Code review is a conversation

When you review, your job is to make sure the code cannot hurt anyone, now or
later. If it is hard to read, say so; if something seems out of place, ask.
Separate real concerns from personal preference by marking the latter as a
"nitpick". When you receive review, assume good intent: questions are there to
build shared understanding of the code, not because anyone distrusts you.
