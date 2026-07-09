# CONTEXT — domain vocabulary

Canonical terms for WikiLambda architecture work. Keep this in sync with the
code; when a term here names a class, the class is the source of truth.

## Feature modes

WikiLambda runs in independently-toggled **feature modes**, each backed by a
config flag (all default `true`; production safety depends on downstream
overrides). "Feature mode" is distinct from the value-representation *mode* in
`ModeSelector.vue`, which is unrelated.

- **Repo mode** (`WikiLambdaEnableRepoMode`) — the wiki hosts ZObjects in the
  main namespace (the Wikifunctions case). Implies the DB-backed
  `ZObjectStore` exists; it does **not** exist in any other mode.
- **Client mode** (`WikiLambdaEnableClientMode`) — the wiki *calls* a remote
  Wikifunctions repo via `{{#function:…}}`. In practice rides alongside repo
  mode on a repo wiki, and stands alone on a client-only wiki (e.g. Wikipedia).
  - *Offline* modifier (`WikiLambdaClientModeOffline`) — emit cached/disabled
    state instead of running new function calls.
- **Abstract mode** (`WikiLambdaEnableAbstractMode`) — the wiki hosts Abstract
  Wikipedia content (an **Abstract Repo**). Abstract content is itself stored
  as ZObjects. When on, repo-mode behaviour is reshaped to answer abstract
  requests.
- **Abstract Client mode** (`WikiLambdaEnableAbstractClientMode`) — the wiki
  displays rendered Abstract Articles in place of missing local ones (an
  **Abstract Client**).
  - *Integration* modifier (`WikiLambdaEnableAbstractClientModeIntegration`) —
    kill-switch for the in-place rendering; only meaningful when Abstract
    Client mode is also on.

### Allowed combinations (as encoded, not enforced)

No code enforces exclusivity. The intended real-world profiles (from the test
fixtures) are:

 - **Repo wiki** = Repo: wikifunctions.org (also in practice a Client);
 - **Abstract wiki** = Abstract: abstract.wikipedia.org (also a Client and AbstractClient);
 - **Client wiki** = Client (no Repo): e.g. fr.wiktionary.org; and
 - **Abstract Client wiki** = AbstractClient (no Repo or Abstract): e.g. fr.wikipedia.org.

Development machines might have all four modes live at once.

Repo ∨ Abstract is frequently needed as a union meaning "this wiki serves WikiLambda
content pages", and gates code blocks.

## Modules

- **WikiLambdaMode** — immutable value object resolving the six mode flags
  once (at construction, from a `Config`) and exposing predicates. The single
  seam for "which mode am I in?", replacing ~75 scattered runtime config reads
  across four inconsistent access paths. Registered as service `WikiLambdaMode`
  (accessor `WikiLambdaServices::getMode()`).
  - Per-mode: `isRepo()`, `isClient()`, `isAbstract()`, `isAbstractClient()`.
  - Modifiers: `isClientOffline()` (raw; only read inside client-mode paths);
    `isAbstractClientIntegration()` — encodes `AbstractClient && Integration`,
    because the integration flag is meaningless alone (mirrors the existing
    `AbstractPageRenderingHandler::integrationEnabled()`).
  - Derived: `isRepoOrAbstract()` — `Repo || Abstract`, the existing union in
    `PageRenderingHandler` guards (a wiki hosting locally-stored content;
    client modes render content but do not host it, so are excluded).
  - **Not** owned by this module (deliberate): the pre-service bootstrap gating
    in `RepoHooks::registerExtension()` (reads `$wg` globals) and the
    `LoadExtensionSchemaUpdates` installer blocks (`has()`-guarded, pre-registry).
    Those are structural registration, not runtime predicate reads.
  - Deferred to a follow-up: capability predicates such as
    `hasLocalObjectStore()` (the "ZObjectStore ⇔ repo" coupling).
