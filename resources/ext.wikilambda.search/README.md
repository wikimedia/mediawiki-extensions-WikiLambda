# WikiLambda Search Module

This module provides custom search functionality for WikiLambda, integrating with Vector 2022's typeahead search component to search through Wikidata entities (QIDs) in Abstract mode or ZObjects in Repo mode.

## Overview

The search module replaces Vector's default search client with custom implementations that:
- **Abstract Wikipedia mode**: Searches Wikidata entities (QIDs) using the Wikidata `wbsearchentities` API
- **Repo mode**: Searches ZObjects using the local MediaWiki search API
- Marks which entities/ZObjects already have content created
- Redirects to creation pages for entities/ZObjects that don't exist yet

## Architecture

The search functionality is a single module **`ext.wikilambda.search`** that:

- Loads `index.js`, `utils.js`, `wikidata.js`, `zobject.js`, and `config.json`
- Exports `init()` which selects the appropriate client based on `WikiLambdaEnableAbstractMode` / `WikiLambdaEnableRepoMode` and initializes Vector's search UI
- Is registered via the `SkinPageReadyConfig` hook (`searchModule`)

**`wikidata.js`** – Abstract Wikipedia mode: searches Wikidata entities via `wbsearchentities`, checks local page existence for the "- AW" marker.

**`zobject.js`** – Repo mode: searches ZObjects via `wikilambdasearch_labels`. Uses `offset/limit` as the API continue token.

**`utils.js`** – Shared helpers

## Configuration

### Dev Configuration

To customize Vector's search options (e.g., disable thumbnails, add highlighting), add the following to `LocalSettings.php`:

```php
$wgVectorTypeahead = [
  "options" => [
    "showThumbnail" => false,
    "showDescription" => true,
    "highlightQuery" => true   // highlight the typed query in result titles (Codex MenuItem)
  ]
];
```

This configuration will be merged with Vector's default search options and applied to the search interface. Set `highlightQuery` to `true` to visually highlight the search query within each result title in the typeahead dropdown.

### Deployment Configuration

For deployment charts (e.g., Helm charts), ensure that:

1. The `extension.json` file includes the hook registration:
   ```json
   "Hooks": {
       "SkinPageReadyConfig": "PageRenderingHandler"
   }
   ```

2. The appropriate WikiLambda mode is enabled:
   ```php
   $wgWikiLambdaEnableAbstractMode = true;  // For Abstract Wikipedia mode
   // OR
   $wgWikiLambdaEnableRepoMode = true;      // For Repo mode
   ```

  In production, these modes are configured to be mutually exclusive. If both are enabled
  in a local development environment, Abstract mode takes precedence and the Wikidata
  search client will be used for the main search field.

3. Vector search options are configured (we should disable thumbnails since our search clients don't provide them; optional `highlightQuery` to highlight typed text in results):
   ```php
   $wgVectorTypeahead = [
      "options" => [
        "showThumbnail" => false,
        "showDescription" => true,
        "highlightQuery" => true
      ]
   ];
   ```

## How It Works

### Module Loading

1. The `SkinPageReadyConfig` hook sets `$config['searchModule']` to `ext.wikilambda.search` when WikiLambda search is enabled.

2. MediaWiki's `mediawiki.page.ready` module loads the search module and calls its `init()` function.

3. The `init()` function selects the client (wikidata or zobject) from config, loads the skin search module (`skins.vector.search` or `skins.minerva.search`), and calls its `init()` with the custom `vectorSearchClient`.

### Search Client Interface

The `vectorSearchClient` object implements the interface expected by Vector:

```javascript
{
    fetchByTitle: function( query, limit, showDescription ) {
        // Returns { fetch: Promise<{ query, results, searchContinue }>, abort: Function }
    },
    loadMore: function( query, offset, limit, showDescription ) {
        // Returns { fetch: Promise<{ query, results, searchContinue }>, abort: Function }
    }
}
```

### Search Result Format

Each result in the `results` array has the shape expected by the Vector typeahead:

- **`value`** – Display text (e.g. `"Paris (Q90)"` or `"My function (Z123)"`)
- **`match`** – Optional string shown when the match differs from the main label (e.g. alias in quotation marks); `undefined` when not needed
- **`description`** – Optional; Wikidata description (if enabled and available)
- **`supportingText`** – Optional short marker used to highlight special state (currently `"AW"` when Abstract Wikipedia content already exists)
- **`url`** – Link to the view page or create-abstract special page
- **`icon`** – Optional. SVG contents of a Codex icon (no wrapping `<svg>`), used by Codex MenuItem for the result row.

## Files

- **`index.js`** – Entry point; selects client from config and initializes Vector search
- **`utils.js`** – Shared helpers and `createVectorSearchClient` factory
- **`wikidata.js`** – Search client for Abstract Wikipedia mode (Wikidata QID search)
- **`zobject.js`** – Search client for Repo mode (ZObject search)
- **`config.json`** – RL config for `WikiLambdaEnableAbstractMode` / `WikiLambdaEnableRepoMode`

## Dependencies

- `mediawiki.api` - For MediaWiki API calls
- `skins.vector.search` / `skins.minerva.search` - Vector/Minerva search modules
