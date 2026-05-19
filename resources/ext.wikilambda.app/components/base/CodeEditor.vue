<!--
    WikiLambda Vue wrapper component for ACE CodeEditor
    https://ace.c9.io/

    @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
    @license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-code-editor"
		:class="{ 'ext-wikilambda-app-code-editor--disabled': disabled }">
		<div
			ref="editorComponent"
			class="ext-wikilambda-app-code-editor__ace"
			data-testid="ace-code-editor"></div>
	</div>
</template>

<script>
const { defineComponent, ref, watch, onMounted } = require( 'vue' );
require( '../../../lib/ace/src/ace.js' );
require( '../../../lib/ace/src/ext-language_tools.js' );
const useDarkMode = require( '../../composables/useDarkMode.js' );

// Keep these in sync with WikifunctionsPFragmentRenderer's allowed elements/custom elements.
// Map of custom element name → description shown in gutter annotations and autocomplete.
const customElementDefinitions = new Map( [
	[ 'ext-wikilambda-image', mw.message( 'wikilambda-codeeditor-image-element-description' ).text() ]
] );
const allowedCustomElements = new Set( customElementDefinitions.keys() );
const allowedTags = new Set( [
	'a', 'abbr', 'b', 'bdi', 'bdo', 'blockquote', 'br', 'caption', 'code', 'dd',
	'del', 'dfn', 'div', 'dl', 'dt', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'hr', 'i', 'ins', 'kbd', 'li', 'ol', 'p', 'q', 's', 'span', 'strike',
	'strong', 'sub', 'sup', 'table', 'td', 'th', 'tr', 'u', 'ul',
	...allowedCustomElements
] );

// Prevents registering the custom element completer more than once across editor instances.
let customElementCompleterRegistered = false;

module.exports = exports = defineComponent( {
	name: 'wl-code-editor',
	props: {
		value: {
			type: String,
			default: ''
		},
		mode: {
			type: String,
			default: 'javascript'
		},
		theme: {
			type: String,
			default: null
		},
		readOnly: {
			type: Boolean,
			default: false
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: [ 'change' ],
	setup( props, { emit } ) {
		// State
		const editorComponent = ref( null );
		const editor = ref( null );

		// Editor configuration
		const options = {
			minLines: 5,
			maxLines: 20,
			showPrintMargin: false,
			fontSize: 12,
			useSoftTabs: false,
			enableBasicAutocompletion: true
		};

		// Theme: Chrome (light) / GitHub Dark (dark) - clean, modern, good readability
		const LIGHT_THEME = 'chrome';
		const DARK_THEME = 'github_dark';

		const { isDarkMode } = useDarkMode();

		/**
		 * Returns the effective ACE theme based on MW dark mode and props.
		 *
		 * @return {string}
		 */
		function getEffectiveTheme() {
			return props.theme || ( isDarkMode.value ? DARK_THEME : LIGHT_THEME );
		}

		/**
		 * Applies disabled-state options to the editor when disabled/readOnly.
		 * Reduces interactive feedback (highlights, cursor) to make the readonly state more visible.
		 *
		 * @param {boolean} isDisabled
		 */
		function applyDisabledOptions( isDisabled ) {
			if ( !editor.value ) {
				return;
			}
			editor.value.setReadOnly( isDisabled );
			editor.value.setOption( 'highlightActiveLine', !isDisabled );
			editor.value.setOption( 'highlightGutterLine', !isDisabled );
			editor.value.setOption( 'highlightSelectedWord', !isDisabled );
		}

		// HTML annotations

		/**
		 * Returns a custom annotation object for disallowed HTML.
		 *
		 * @param {number} row
		 * @param {number} column
		 * @param {string} text
		 * @return {Object} Annotation object
		 */
		const createCustomAnnotation = ( row, column, text ) => ( {
			row,
			column,
			text,
			type: 'error',
			code: 'DISALLOWED_HTML'
		} );

		/**
		 * Returns ACE annotations for disallowed HTML tags.
		 *
		 * @see https://www.mediawiki.org/wiki/Help:HTML_in_wikitext#Allowed_HTML_tags
		 *
		 * @param {Object} session - ACE editor session
		 * @return {Array} List of annotation objects
		 */
		function getDisallowedTagAnnotations( session ) {

			const disallowedTagRegex = /<\/?([a-z0-9-]+)[^>]*?>/gi;
			const lines = session.doc.getAllLines();
			const annotations = [];

			lines.forEach( ( line, row ) => {
				let match;
				while ( ( match = disallowedTagRegex.exec( line ) ) !== null ) {
					const tagName = match[ 1 ].toLowerCase();
					if ( !allowedTags.has( tagName ) ) {
						annotations.push(
							createCustomAnnotation(
								row,
								match.index,
								`Usage of <${ tagName }> tags is not allowed.`
							)
						);
					}
				}
			} );

			return annotations;
		}

		/**
		 * Returns ACE annotations for disallowed event handler attributes (e.g. onclick).
		 *
		 * @see https://doc.wikimedia.org/mediawiki-core/master/php/classMediaWiki_1_1Parser_1_1Sanitizer.html#af3c1cc4e16fb422fded4a29f56227f74
		 *
		 * @param {Object} session - ACE editor session
		 * @return {Array} List of annotation objects
		 */
		function getEventAttributeAnnotations( session ) {
			const eventAttrRegex = /\s(on\w+)\s*=\s*(['"]).*?\2/gi;
			const lines = session.doc.getAllLines();
			const annotations = [];

			lines.forEach( ( line, row ) => {
				let match;
				while ( ( match = eventAttrRegex.exec( line ) ) !== null ) {
					const attrName = match[ 1 ];
					annotations.push(
						createCustomAnnotation(
							row,
							match.index,
							`Event handler attribute '${ attrName }' is not allowed.`
						)
					);
				}
			} );

			return annotations;
		}

		/**
		 * Returns ACE annotations for JavaScript URLs in href or src attributes.
		 *
		 * @see https://doc.wikimedia.org/mediawiki-core/master/php/classMediaWiki_1_1Parser_1_1Sanitizer.html#af3c1cc4e16fb422fded4a29f56227f74
		 *
		 * @param {Object} session - ACE editor session
		 * @return {Array} List of annotation objects
		 */
		function getJavaScriptUrlAnnotations( session ) {
			// Matches href or src attributes with javascript: URLs, ignoring quotes
			const jsHrefRegex = /\s(?:href|src)\s*=\s*(['"])\s*javascript:[^\1]*\1/gi;
			// Matches url(javascript:...) with or without quotes, and ignores whitespace,
			// and also matches background-image: url(javascript:...) in style attributes
			const jsCssUrlRegex = /url\s*\(\s*(?:(['"])\s*javascript\s*:[^'"]*\1|javascript\s*:[^)]+)\s*\)/gi;
			const lines = session.doc.getAllLines();
			const annotations = [];

			lines.forEach( ( line, row ) => {
				let match;
				// javascript in href/src attributes
				while ( ( match = jsHrefRegex.exec( line ) ) !== null ) {
					annotations.push(
						createCustomAnnotation(
							row,
							match.index,
							'JavaScript URLs are not allowed in attributes like href or src.'
						)
					);
				}
				// Any url(javascript:...) in inline style, style attribute, or background-image
				while ( ( match = jsCssUrlRegex.exec( line ) ) !== null ) {
					annotations.push(
						createCustomAnnotation(
							row,
							match.index,
							'JavaScript URLs are not allowed in CSS url().'
						)
					);
				}
			} );

			return annotations;
		}

		/**
		 * Returns info annotations for each custom element found in the session.
		 * Shown as blue info markers in the gutter.
		 *
		 * @param {Object} session - ACE editor session
		 * @return {Array}
		 */
		function getCustomElementInfoAnnotations( session ) {
			const lines = session.doc.getAllLines();
			const annotations = [];
			lines.forEach( ( line, row ) => {
				customElementDefinitions.forEach( ( description, name ) => {
					const col = line.toLowerCase().indexOf( '<' + name );
					if ( col !== -1 ) {
						annotations.push( {
							row,
							column: col,
							text: description,
							type: 'info',
							code: 'CUSTOM_ELEMENT_INFO'
						} );
					}
				} );
			} );
			return annotations;
		}

		// Editor initialization
		/**
		 * Handles custom HTML annotations for disallowed tags, event attributes, and JavaScript URLs.
		 * Called when the ACE editor's annotation changes and mode is 'html'.
		 *
		 * @return {void}
		 */
		function handleHtmlAnnotations() {
			const session = editor.value.session;
			const currentAnnotations = session.getAnnotations() || [];

			function mentionsCustomElement( a ) {
				return Array.from( allowedCustomElements ).some( ( el ) => a.text.includes( el ) );
			}

			// Filter out:
			// - doctype annotations (not useful for code snippets)
			// - ACE built-in errors that mention one of our allowed custom elements
			//   (e.g. "Trailing solidus not allowed on element ext-wikilambda-image.")
			let filteredAnnotations = currentAnnotations.filter(
				( a ) => !/doctype/i.test( a.text ) && !mentionsCustomElement( a )
			);

			// If we suppressed any custom-element annotation, ACE may also have emitted a
			// generic "Expected closing tag. Unexpected end of file." caused solely by the
			// self-closing custom-element syntax — suppress that artifact too.
			const didFilterCustomElement = filteredAnnotations.length <
				currentAnnotations.filter( ( a ) => !/doctype/i.test( a.text ) ).length;
			if ( didFilterCustomElement ) {
				filteredAnnotations = filteredAnnotations.filter(
					( a ) => !/Expected closing tag/i.test( a.text )
				);
			}

			let hasChanged = filteredAnnotations.length !== currentAnnotations.length;
			const hasCustom = filteredAnnotations.some(
				( a ) => a.code === 'DISALLOWED_HTML' || a.code === 'CUSTOM_ELEMENT_INFO'
			);

			if ( !hasCustom ) {
				const customAnnotations = [
					...getDisallowedTagAnnotations( session ),
					...getEventAttributeAnnotations( session ),
					...getJavaScriptUrlAnnotations( session ),
					...getCustomElementInfoAnnotations( session )
				];

				if ( customAnnotations.length ) {
					filteredAnnotations.push( ...customAnnotations );
					hasChanged = true;
				}
			}

			if ( hasChanged ) {
				// This will trigger the changeAnnotation event
				session.setAnnotations( filteredAnnotations );
			}
		}

		/**
		 * Applies the effective theme to the editor. Call when MW dark mode or props.theme changes.
		 */
		function applyTheme() {
			if ( editor.value ) {
				editor.value.setTheme( 'ace/theme/' + getEffectiveTheme() );
			}
		}

		/**
		 * Registers the custom element completer with ACE's language tools (once, globally).
		 * The completer only fires in HTML mode when the cursor is inside a tag opening.
		 */
		function initializeAutocomplete() {
			if ( customElementCompleterRegistered ) {
				return;
			}
			customElementCompleterRegistered = true;
			const langTools = window.ace.require( 'ace/ext/language_tools' );
			langTools.addCompleter( {
				getCompletions( ed, sess, pos, prefix, callback ) {
					if ( sess.getMode().$id !== 'ace/mode/html' ) {
						callback( null, [] );
						return;
					}
					const lineBeforeCursor = sess.getLine( pos.row ).slice( 0, pos.column );
					if ( !/<[a-z-]*$/.test( lineBeforeCursor ) ) {
						callback( null, [] );
						return;
					}
					const completions = [];
					customElementDefinitions.forEach( ( description, name ) => {
						completions.push( {
							caption: name,
							snippet: name + ' mid="$1" size="thumb" />',
							meta: 'Commons Image',
							docText: description
						} );
					} );
					callback( null, completions );
				}
			} );
		}

		/**
		 * Initializes the internal Ace Code Editor
		 */
		function initialize() {
			editor.value = window.ace.edit( editorComponent.value, { value: props.value } );
			const session = editor.value.getSession();

			// Set base path to know where to import modules while setting language and theme
			let basePath = mw.config.get( 'wgExtensionAssetsPath', '' );
			// ACE doesn't understand relative links
			if ( basePath.slice( 0, 2 ) === '//' ) {
				basePath = window.location.protocol + basePath;
			}
			// TODO (T406154): Figure a way to not have this path hardcoded, perhaps wgWikiLambdaAcePath?
			window.ace.config.set( 'basePath', basePath + '/WikiLambda/resources/lib/ace/src' );

			// Set readonly and disabled-state options when readonly or disabled
			applyDisabledOptions( props.readOnly || props.disabled );

			// Set theme based on MW dark mode (chrome / clouds_midnight)
			applyTheme();

			// Set Language
			session.setMode( 'ace/mode/' + props.mode );

			// Wrap lines
			session.setUseWrapMode( true );

			// Listen for changes in the session annotations (warnings, errors, etc.)
			session.on( 'changeAnnotation', () => {
				if ( props.mode === 'html' ) {
					handleHtmlAnnotations();
				}
			} );

			// Set custom options
			editor.value.setOptions( options );

			initializeAutocomplete();

			// Set listener
			editor.value.on( 'change', () => {
				emit( 'change', editor.value.getValue() );
			} );
		}

		// Watch
		watch( () => props.value, ( newValue ) => {
			editor.value.setValue( newValue, 1 );
		} );

		watch( () => props.mode, ( newMode ) => {
			editor.value.setOption( 'mode', 'ace/mode/' + newMode );
		} );

		watch( () => props.theme, applyTheme );

		watch( () => props.readOnly, ( newValue ) => {
			applyDisabledOptions( newValue || props.disabled );
		} );

		watch( () => props.disabled, ( newValue ) => {
			applyDisabledOptions( newValue || props.readOnly );
		} );

		watch( () => isDarkMode.value, applyTheme );

		onMounted( () => {
			initialize();
		} );

		return {
			editorComponent
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-code-editor {
	.ext-wikilambda-app-code-editor__ace.ace_editor {
		width: 100%;
		border: 1px solid @border-color-subtle;
		min-height: 85px;
		z-index: 0;
		box-sizing: @box-sizing-base;
		font-size: calc( @font-size-medium * 0.857 );
	}

	&--disabled {
		.ext-wikilambda-app-code-editor__ace.ace_editor {
			.ace_cursor {
				opacity: 0;
			}
		}
	}

	// Light mode only: use skin's disabled background when disabled
	// In dark mode, ACE theme provides its own background
	html:not( .skin-theme-clientpref-night ) &--disabled {
		.ext-wikilambda-app-code-editor__ace.ace_editor {
			background-color: @background-color-disabled-subtle;
		}
	}

	@media ( prefers-color-scheme: dark ) {
		html.skin-theme-clientpref-os .ext-wikilambda-app-code-editor--disabled {
			.ext-wikilambda-app-code-editor__ace.ace_editor {
				background-color: unset;
			}
		}
	}
}

</style>
