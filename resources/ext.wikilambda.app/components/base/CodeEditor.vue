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
			default: 'chrome'
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
		const editorComponent = ref( null );
		const editor = ref( null );
		const options = {
			minLines: 5,
			maxLines: 20,
			showPrintMargin: false,
			fontSize: 12,
			useSoftTabs: false
		};

		/**
		 * Returns a custom annotation object for disallowed HTML.
		 *
		 * @param {number} row
		 * @param {number} column
		 * @param {string} text
		 * @return {Object} Annotation object
		 */
		function createCustomAnnotation( row, column, text ) {
			return {
				row,
				column,
				text,
				type: 'error',
				code: 'DISALLOWED_HTML'
			};
		}

		/**
		 * Returns ACE annotations for disallowed HTML tags.
		 *
		 * @see https://www.mediawiki.org/wiki/Help:HTML_in_wikitext#Allowed_HTML_tags
		 *
		 * @param {Object} session - ACE editor session
		 * @return {Array} List of annotation objects
		 */
		function getDisallowedTagAnnotations( session ) {
			// Keep this in sync with WikifunctionsPFragmentSanitiserTokenHandler::ALLOWEDELEMENTS
			const allowedTags = new Set( [
				'a', 'abbr', 'b', 'bdi', 'bdo', 'blockquote', 'br', 'caption', 'code', 'dd',
				'del', 'dfn', 'div', 'dl', 'dt', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
				'hr', 'i', 'ins', 'kbd', 'li', 'ol', 'p', 'q', 's', 'span', 'strike',
				'strong', 'sub', 'sup', 'table', 'td', 'th', 'tr', 'u', 'ul'
			] );

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
		 * Handles custom HTML annotations for disallowed tags, event attributes, and JavaScript URLs.
		 * Called when the ACE editor's annotation changes and mode is 'html'.
		 *
		 * @return {void}
		 */
		function handleHtmlAnnotations() {
			const session = editor.value.session;
			const currentAnnotations = session.getAnnotations() || [];

			// Filter out doctype annotations, which are not useful for code snippets
			const filteredAnnotations = currentAnnotations.filter( ( a ) => !/doctype/i.test( a.text ) );

			let hasChanged = filteredAnnotations.length !== currentAnnotations.length;
			const hasCustom = filteredAnnotations.some( ( a ) => a.code === 'DISALLOWED_HTML' );

			if ( !hasCustom ) {
				const customAnnotations = [
					...getDisallowedTagAnnotations( session ),
					...getEventAttributeAnnotations( session ),
					...getJavaScriptUrlAnnotations( session )
				];

				if ( customAnnotations.length ) {
					// Append custom annotations
					filteredAnnotations.push( ...customAnnotations );
					hasChanged = true;
				}
			}

			if ( hasChanged ) {
				// Set the new annotations
				// This will trigger the changeAnnotation event
				session.setAnnotations( filteredAnnotations );
			}

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

			// Set readonly attribute when readonly or disabled
			editor.value.setReadOnly( props.readOnly || props.disabled );

			// Set theme
			editor.value.setTheme( 'ace/theme/' + props.theme );

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

			// Set listener
			editor.value.on( 'change', () => {
				emit( 'change', editor.value.getValue() );
			} );
		}

		// Watchers
		watch( () => props.value, ( newValue ) => {
			editor.value.setValue( newValue, 1 );
		} );

		watch( () => props.mode, ( newMode ) => {
			editor.value.setOption( 'mode', 'ace/mode/' + newMode );
		} );

		watch( () => props.theme, ( newTheme ) => {
			editor.value.setTheme( 'ace/theme/' + newTheme );
		} );

		watch( () => props.readOnly, ( newValue ) => {
			editor.value.setReadOnly( newValue );
		} );

		watch( () => props.disabled, ( newValue ) => {
			editor.value.setReadOnly( newValue );
		} );

		// Lifecycle
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
			background-color: @background-color-disabled-subtle;
		}
	}
}
</style>
