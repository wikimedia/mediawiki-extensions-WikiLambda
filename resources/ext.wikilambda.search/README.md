# WikiLambda Search Module

This module provides custom search functionality for WikiLambda, integrating with Vector 2022's typeahead search component to search through Wikidata entities (QIDs) in Abstract mode or ZObjects in Repo mode.

## Overview

The search module replaces Vector's default search client with custom implementations that:
- **Abstract Wikipedia mode**: Searches Wikidata entities (QIDs) using the Wikidata `wbsearchentities` API
- **Repo mode**: Searches ZObjects using the local MediaWiki search API
- Marks which entities have no Abstract article yet, with the red-link style and a text marker
- Redirects to creation pages for entities/ZObjects that don't exist yet

## Architecture

The search functionality is a single module **`ext.wikilambda.search`** that:

- Loads `index.js`, `utils.js`, `wikidata.js`, `zobject.js`, and `config.json`
- Exports `init()` which selects the appropriate client based on `WikiLambdaEnableAbstractMode` / `WikiLambdaEnableRepoMode` and initializes Vector's search UI
- Is registered via the `SkinPageReadyConfig` hook (`searchModule`)

**`wikidata.js`** – Abstract Wikipedia mode: searches Wikidata entities via `wbsearchentities`, checks local page existence to mark the entities with no Abstract article.

**`zobject.js`** – Repo mode: searches ZObjects via `wikilambdasearch_labels`. Uses `offset/limit` as the API continue token.

**`utils.js`** – Shared helpers

## Configuration

### Dev Configuration

To customize Vector's search options (e.g. thumbnails, highlighting), add the following to `LocalSettings.php`:

```php
$wgVectorTypeahead = [
  "options" => [
    "showThumbnail" => true,
    "showDescription" => true,
    "highlightQuery" => true   // highlight the typed query in result titles (Codex MenuItem)
  ]
];
```

This configuration will be merged with Vector's default search options and applied to the search interface. Set `highlightQuery` to `true` to visually highlight the search query within each result title in the typeahead dropdown.

Keep `showThumbnail` set to `true`: Abstract Wikipedia mode fetches a thumbnail for each result from Wikidata `pageimages`, and that request is wasted if Vector does not show thumbnails.

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

3. Vector search options are configured (Abstract Wikipedia mode supplies Wikidata thumbnails, so keep `showThumbnail` on; optional `highlightQuery` to highlight typed text in results):
   ```php
   $wgVectorTypeahead = [
      "options" => [
        "showThumbnail" => true,
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
- **`supportingText`** – Optional short marker shown after the label (currently `"– No article yet"` when no Abstract article exists). This states in text what the red-link colour only shows visually
- **`class`** – Optional CSS class. Codex copies unknown properties onto the menu item element, so `ext-wikilambda-search-result--new` shows the result as a red link (see `ext.wikilambda.search.less`)
- **`thumbnail`** – Optional; Wikidata `pageimages` thumbnail as `{ url, width, height }`. Only shown while `showThumbnail` is on, and Codex draws a placeholder for the results that have none
- **`url`** – Link to the view page or create-abstract special page
- **`icon`** – Optional Codex icon object. Codex MenuItem draws it in place of the thumbnail, so it only appears while `showThumbnail` is off; neither client sets it today.

## Files

- **`index.js`** – Entry point; selects client from config and initializes Vector search
- **`utils.js`** – Shared helpers and `createVectorSearchClient` factory
- **`wikidata.js`** – Search client for Abstract Wikipedia mode (Wikidata QID search)
- **`zobject.js`** – Search client for Repo mode (ZObject search)
- **`config.json`** – RL config for `WikiLambdaEnableAbstractMode` / `WikiLambdaEnableRepoMode`
- **`ext.wikilambda.search.less`** – Styles for the results with no Abstract article

## Dependencies

- `mediawiki.api` - For MediaWiki API calls
- `skins.vector.search` / `skins.minerva.search` - Vector/Minerva search modules
