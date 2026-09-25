<!--
	WikiLambda Vue wrapper component for the CodeMirror extension
	https://www.mediawiki.org/wiki/Extension:CodeMirror

	Selected by CodeEditor.vue when $wgWikiLambdaUseCodeMirror is true. It has
	the same props and events as AceEditor.vue, so the two are interchangeable.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-code-editor"
		:class="{ 'ext-wikilambda-app-code-editor--disabled': disabled }">
		<component
			:is="editorComponent"
			v-if="editorComponent"
			class="ext-wikilambda-app-code-editor__codemirror"
			data-testid="codemirror-code-editor"
			compact
			:model-value="value"
			:mode="editorMode"
			:theme="editorTheme"
			:read-only="readOnly"
			:disabled="disabled"
			:rows="minRows"
			:max-rows="maxRows"
			@update:model-value="$emit( 'change', $event )"
			@ready="onReady"
		></component>
		<plain-text-editor
			v-else-if="loadFailed"
			:value="value"
			:read-only="readOnly"
			:disabled="disabled"
			@change="$emit( 'change', $event )"
		></plain-text-editor>
	</div>
</template>

<script>
const { defineComponent, computed, ref, shallowRef } = require( 'vue' );
const PlainTextEditor = require( './PlainTextEditor.vue' );
const {
	customElementDefinitions,
	findHtmlProblems
} = require( '../../utils/htmlValidationUtils.js' );

// The modules needed to build the editor. The mode module loads on demand.
const CODE_MIRROR_MODULES = [ 'ext.CodeMirror.VueComponent', 'ext.CodeMirror.lib' ];

// The editor starts at five rows and grows to twenty, as the ACE editor does.
const MIN_ROWS = 5;
const MAX_ROWS = 20;

// The mode to use before the user selects a programming language.
const DEFAULT_MODE = 'javascript';

// CodeMirror lets the user pick a theme. Lock it to the plain one, so that the
// editor looks the same as the ACE editor. CodeMirror still follows the skin's
// dark mode, because it adds the '-light' or '-dark' suffix itself.
const DEFAULT_THEME = 'default';

module.exports = exports = defineComponent( {
	name: 'wl-code-mirror-editor',
	components: {
		'plain-text-editor': PlainTextEditor
	},
	props: {
		value: {
			type: String,
			default: ''
		},
		mode: {
			type: String,
			default: DEFAULT_MODE
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
	setup( props ) {
		// State
		const editorComponent = shallowRef( null );
		const lib = shallowRef( null );
		const loadFailed = ref( false );

		// CodeMirror needs a mode, but the language is empty until the user
		// picks one. The editor is disabled until then, so the mode is unseen.
		const editorMode = computed( () => props.mode || DEFAULT_MODE );
		const editorTheme = computed( () => props.theme || DEFAULT_THEME );

		// ResourceLoader loads each module only once, however many editors
		// the page has.
		mw.loader.using( CODE_MIRROR_MODULES ).then( ( req ) => {
			lib.value = req( 'ext.CodeMirror.lib' );
			editorComponent.value = req( 'ext.CodeMirror.VueComponent' );
		} ).catch( ( error ) => {
			loadFailed.value = true;
			mw.log.error( '[WikiLambda] Unable to load CodeMirror.', error );
		} );

		/**
		 * Reports every HTML problem to CodeMirror.
		 *
		 * The rules are shared with AceEditor.vue. They run on the whole
		 * document, because CodeMirror puts a diagnostic at an offset.
		 *
		 * @param {string} text Contents of the editor
		 * @return {Object[]} CodeMirror diagnostics
		 */
		function getHtmlDiagnostics( text ) {
			return findHtmlProblems( text ).map( ( problem ) => ( {
				from: problem.index,
				to: problem.index + problem.length,
				severity: problem.severity,
				message: problem.message
			} ) );
		}

		/**
		 * Suggests the custom elements after the user types an opening angle
		 * bracket. Each suggestion adds the attributes the element needs.
		 *
		 * @param {Object} context CodeMirror completion context
		 * @return {Object|null} CodeMirror completion result, or null for no match
		 */
		function getCustomElementCompletions( context ) {
			const before = context.matchBefore( /<[a-z-]*/ );
			if ( !before ) {
				return null;
			}
			const { snippetCompletion } = lib.value;
			return {
				// Keep the angle bracket, and replace only the name after it.
				from: before.from + 1,
				options: [ ...customElementDefinitions ].map(
					( [ name, { description, detail } ] ) => snippetCompletion(
						`${ name } mid="\${}" size="thumb" />`,
						{
							label: name,
							detail: detail,
							info: description
						}
					)
				)
			};
		}

		/**
		 * Adds the HTML rules once CodeMirror is ready. CodeMirror rebuilds the
		 * editor when the mode changes, so this runs again after every change.
		 *
		 * @param {Object} codeMirror The CodeMirror instance
		 */
		function onReady( codeMirror ) {
			if ( editorMode.value !== 'html' ) {
				return;
			}

			codeMirror.applyLinter( getHtmlDiagnostics );

			// Suggestions are of no use in an editor the user cannot type in.
			if ( props.readOnly || props.disabled ) {
				return;
			}
			const language = codeMirror.view.state.facet( lib.value.language );
			if ( language ) {
				codeMirror.applyExtension(
					language.data.of( { autocomplete: getCustomElementCompletions } )
				);
			}
		}

		return {
			editorComponent,
			editorMode,
			editorTheme,
			loadFailed,
			minRows: MIN_ROWS,
			maxRows: MAX_ROWS,
			onReady
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-code-editor {
	.ext-wikilambda-app-code-editor__codemirror .cm-editor {
		border: 1px solid @border-color-subtle;
		box-sizing: @box-sizing-base;
		font-size: calc( @font-size-medium * 0.857 );
	}

	&--disabled {
		.ext-wikilambda-app-code-editor__codemirror .cm-editor {
			background-color: @background-color-disabled-subtle;
		}
	}
}
</style>
