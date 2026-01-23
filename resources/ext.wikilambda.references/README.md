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

The module consists of three parts:

1. **`ext.wikilambda.references.styles`** - CSS-only module (should be loaded early to prevent FOUC)
2. **`ext.wikilambda.references`** - Vanilla JS initialization (scans DOM, creates buttons)
3. **`ext.wikilambda.references.vue`** - Vue app (lazy-loaded on first interaction)

#### In ResourceLoader modules

When including as a dependency in `extension.json`, the module is automatically loaded:

```json
{
  "dependencies": [
    "ext.wikilambda.references"
  ]
}
```

The Vue app is lazy-loaded automatically when a user interacts with a reference (hover/click).

#### In PHP (Special Pages, etc.)

For early CSS loading to prevent FOUC (Flash of Unstyled Content), load the styles module separately:

```php
$output->addModuleStyles( 'ext.wikilambda.references.styles' );
$output->addModules( 'ext.wikilambda.references' );
```

This will load `ext.wikilambda.references` immediately (which scans the DOM and creates buttons). The Vue app (`ext.wikilambda.references.vue`) is automatically lazy-loaded when a user interacts with a reference.

### Dynamic Content

For dynamically loaded content (e.g., async HTML fragments), fire the custom MediaWiki hook:

```javascript
mw.hook('wikilambda.references.content').fire( containerElement );
```

Where `containerElement` is the DOM element or jQuery object containing the new reference elements.

## Architecture

The module uses a lazy-loading architecture to minimize initial JavaScript payload:

1. **`init.js`** (vanilla JS) - Loads immediately, scans DOM, creates buttons
2. **`vue.js`** - Lazy-loaded only when a user interacts with a reference
3. This reduces the initial bundle size in read mode (Vue is only loaded on interaction)

## Components

### ReferenceManager

The main Vue component that orchestrates popovers and drawers. Lazy-mounted when first needed.

### ReferencePopover

Desktop popover component using Codex's `CdxPopover`. Supports hover and click modes (a11y).

### Drawer

Mobile drawer component that slides up from the bottom. Includes focus trapping and scroll locking.

## Composables

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
