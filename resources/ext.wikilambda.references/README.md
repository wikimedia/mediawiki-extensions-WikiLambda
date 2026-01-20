# WikiLambda References Module

This module provides an interactive reference system for WikiLambda, displaying references in popovers on desktop (hover/click) and drawers on mobile (click).

## Features

- **Desktop**: Hover to preview (a11y: click to pin open)
- **Mobile**: Click to open in a bottom drawer
- **Accessibility**: Full keyboard navigation, focus trapping, ARIA attributes
- **Progressive Enhancement**: CSS-only fallback for no-JS environments
- **Automatic Numbering**: References are automatically numbered using CSS counters

## Usage

### HTML Structure

To create a reference, use the following HTML structure:

```html
<sup class="ext-wikilambda-reference">Reference text content here</sup>
```

For convenience of users, you can also use other elements (like `<span>`) - they will be automatically wrapped in a `<sup>` element:

```html
<span class="ext-wikilambda-reference">Reference text content here</span>
```

### How It Works

1. **On Page Load**: The module scans the page for elements with class `ext-wikilambda-reference`
2. **Transformation**: Each reference is transformed into:
   ```html
   <sup class="ext-wikilambda-reference" data-wikilambda-reference-init="1">
     <button class="ext-wikilambda-reference__button"
             aria-label="Open reference"
             aria-expanded="false">[1]</button>
     <span class="ext-wikilambda-reference__note">Reference text content here</span>
   </sup>
   ```
3. **Display**:
   - The button shows a numbered marker (e.g., `[1]`, `[2]`, `[3]`) via CSS
   - The reference text is hidden by default and shown in the popover/drawer

### Loading the Module

The module consists of two parts:

1. **`ext.wikilambda.references.styles`** - CSS-only module (should be loaded early to prevent FOUC)
2. **`ext.wikilambda.references`** - JavaScript module (includes styles as a dependency)

#### In ResourceLoader modules

When including as a dependency in `extension.json`, the styles are automatically included:

```json
{
  "dependencies": [
    "ext.wikilambda.references"
  ]
}
```

#### In PHP (Special Pages, etc.)

For early CSS loading to prevent FOUC (Flash of Unstyled Content), load the styles module separately:

```php
$output->addModuleStyles( 'ext.wikilambda.references.styles' );
$output->addModules( 'ext.wikilambda.references' );
```

### Dynamic Content

For dynamically loaded content (e.g., async HTML fragments), fire the custom MediaWiki hook:

```javascript
mw.hook('wikilambda.references.content').fire( containerElement );
```

Where `containerElement` is the DOM element or jQuery object containing the new reference elements.

## Components

### ReferenceManager

The main component that orchestrates popovers and drawers. Automatically mounted on page load.

### ReferencePopover

Desktop popover component using Codex's `CdxPopover`. Supports hover and click modes (a11y).

### Drawer

Mobile drawer component that slides up from the bottom. Includes focus trapping and scroll locking.

## Composables

### useReferenceTriggers

Manages DOM scanning and button creation for reference triggers. Handles:
- Finding unprocessed references
- Transforming HTML structure
- Attaching event handlers
- Listening to MediaWiki hooks for dynamic content

### useFocusTrap

Traps keyboard focus within popover/drawer when open. Only activates in click mode (not hover mode) to prevent unwanted focus outlines.

### useScrollLock

Locks body scroll when drawer is open, preventing page jumps. Uses `position: fixed` technique for iOS Safari compatibility.

### useBreakpoints

Responsive breakpoint detection for mobile/desktop behavior.

## CSS-Only Fallback

When JavaScript is disabled (`html.client-nojs`), references still work:

- Shows numbered marker `[1]`, `[2]`, etc. normally
- On hover, shows full reference text in a styled tooltip

## Accessibility

- Full keyboard navigation support
- Focus trapping in popover/drawer
- ARIA attributes (`aria-label`, `aria-expanded`)
- Focus-visible outlines for keyboard users only
- Escape key closes drawer/popover
- Focus restoration when closing

## Dependencies

- Vue.js (via ResourceLoader)
- Codex components: `CdxPopover`, `CdxButton`, `CdxIcon`
- MediaWiki hooks system

## Messages

The module uses the following i18n message:

- `wikilambda-reference` - Title for reference popover/drawer
