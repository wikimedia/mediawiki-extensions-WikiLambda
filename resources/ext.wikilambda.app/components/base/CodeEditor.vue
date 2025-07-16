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
			ref="editor"
			class="ext-wikilambda-app-code-editor__ace"
			data-testid="ace-code-editor"></div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
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
	data: function () {
		return {
			options: {
				minLines: 5,
				maxLines: 20,
				showPrintMargin: false,
				fontSize: 12,
				useSoftTabs: false
			},
			editor: null
		};
	},
	methods: {
		/**
		 * Initializes the internal Ace Code Editor
		 */
		initialize: function () {
			this.editor = window.ace.edit( this.$refs.editor, { value: this.value } );
			const session = this.editor.getSession();

			// Set base path to know where to import modules while setting language and theme
			let basePath = mw.config.get( 'wgExtensionAssetsPath', '' );
			// ACE doesn't understand relative links
			if ( basePath.slice( 0, 2 ) === '//' ) {
				basePath = window.location.protocol + basePath;
			}
			// TODO: Figure a way to not have this path hardcoded
			window.ace.config.set( 'basePath', basePath + '/WikiLambda/resources/lib/ace/src' );

			// Set readonly attribute when readonly or disabled
			this.editor.setReadOnly( this.readOnly || this.disabled );

			// Set theme
			this.editor.setTheme( 'ace/theme/' + this.theme );

			// Set Language
			session.setMode( 'ace/mode/' + this.mode );

			// Wrap lines
			session.setUseWrapMode( true );

			// Listen for changes in the session annotations (warnings, errors, etc.)
			session.on( 'changeAnnotation', () => {
				if ( this.mode === 'html' ) {
					this.handleHtmlAnnotations();
				}
			} );

			// Set custom options
			// TODO: Do we want to pass options as a prop?
			this.editor.setOptions( this.options );

			// Set listener
			this.editor.on( 'change', () => {
				this.$emit( 'change', this.editor.getValue() );
			} );
		},

		/**
		 * Handles custom HTML annotations for disallowed tags, event attributes, and JavaScript URLs.
		 * Called when the ACE editor's annotation changes and mode is 'html'.
		 *
		 * @return {void}
		 */
		handleHtmlAnnotations: function () {
			const session = this.editor.session;
			const currentAnnotations = session.getAnnotations() || [];

			// Filter out doctype annotations, which are not useful for code snippets
			const filteredAnnotations = currentAnnotations.filter( ( a ) => !/doctype/i.test( a.text ) );

			let hasChanged = filteredAnnotations.length !== currentAnnotations.length;
			const hasCustom = filteredAnnotations.some( ( a ) => a.code === 'DISALLOWED_HTML' );

			if ( !hasCustom ) {
				const customAnnotations = [
					...this.getDisallowedTagAnnotations( session ),
					...this.getEventAttributeAnnotations( session ),
					...this.getJavaScriptUrlAnnotations( session )
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
		},

		/**
		 * Returns a custom annotation object for disallowed HTML.
		 *
		 * @param {number} row
		 * @param {number} column
		 * @param {string} text
		 * @param {Object} session - ACE editor session
		 * @return {Array} List of annotation objects
		 */
		createCustomAnnotation: function ( row, column, text ) {
			return {
				row,
				column,
				text,
				type: 'error',
				code: 'DISALLOWED_HTML'
			};
		},

		/**
		 * Returns ACE annotations for disallowed HTML tags.
		 *
		 * @see https://www.mediawiki.org/wiki/Help:HTML_in_wikitext#Allowed_HTML_tags
		 *
		 * @param {Object} session - ACE editor session
		 * @return {Array} List of annotation objects
		 */
		getDisallowedTagAnnotations: function ( session ) {
			const allowedTags = new Set( [
				'abbr', 'b', 'bdi', 'bdo', 'big', 'blockquote', 'br', 'caption',
				'center', 'cite', 'code', 'data', 'dd', 'del', 'dfn', 'div', 'dl',
				'dt', 'em', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i',
				'ins', 'kbd', 'li', 'link', 'mark', 'meta', 'ol', 'p', 'pre', 'q',
				'rb', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'small', 'span',
				'strike', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'th',
				'thead', 'time', 'tr', 'tt', 'u', 'ul', 'var', 'wbr'
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
							this.createCustomAnnotation(
								row,
								match.index,
								`Usage of <${ tagName }> tags is not allowed.`
							)
						);
					}
				}
			} );

			return annotations;
		},

		/**
		 * Returns ACE annotations for disallowed event handler attributes (e.g. onclick).
		 *
		 * @see https://doc.wikimedia.org/mediawiki-core/master/php/classMediaWiki_1_1Parser_1_1Sanitizer.html#af3c1cc4e16fb422fded4a29f56227f74
		 *
		 * @param {Object} session - ACE editor session
		 * @return {Array} List of annotation objects
		 */
		getEventAttributeAnnotations: function ( session ) {
			const eventAttrRegex = /\s(on\w+)\s*=\s*(['"]).*?\2/gi;
			const lines = session.doc.getAllLines();
			const annotations = [];

			lines.forEach( ( line, row ) => {
				let match;
				while ( ( match = eventAttrRegex.exec( line ) ) !== null ) {
					const attrName = match[ 1 ];
					annotations.push(
						this.createCustomAnnotation(
							row,
							match.index,
							`Event handler attribute '${ attrName }' is not allowed.`
						)
					);
				}
			} );

			return annotations;
		},

		/**
		 * Returns ACE annotations for JavaScript URLs in href or src attributes.
		 *
		 * @see https://doc.wikimedia.org/mediawiki-core/master/php/classMediaWiki_1_1Parser_1_1Sanitizer.html#af3c1cc4e16fb422fded4a29f56227f74
		 *
		 * @param {Object} session - ACE editor session
		 * @return {Array} List of annotation objects
		 */
		getJavaScriptUrlAnnotations: function ( session ) {
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
						this.createCustomAnnotation(
							row,
							match.index,
							'JavaScript URLs are not allowed in attributes like href or src.'
						)
					);
				}
				// Any url(javascript:...) in inline style, style attribute, or background-image
				while ( ( match = jsCssUrlRegex.exec( line ) ) !== null ) {
					annotations.push(
						this.createCustomAnnotation(
							row,
							match.index,
							'JavaScript URLs are not allowed in CSS url().'
						)
					);
				}
			} );

			return annotations;
		}
	},
	watch: {
		value: function ( newValue ) {
			this.editor.setValue( newValue, 1 );
		},
		mode: function ( newMode ) {
			this.editor.setOption( 'mode', 'ace/mode/' + newMode );
		},
		theme: function ( newTheme ) {
			this.editor.setTheme( 'ace/theme/' + newTheme );
		},
		readOnly: function ( newValue ) {
			this.editor.setReadOnly( newValue );
		},
		disabled: function ( newValue ) {
			this.editor.setReadOnly( newValue );
		}
	},
	mounted: function () {
		this.initialize();
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
