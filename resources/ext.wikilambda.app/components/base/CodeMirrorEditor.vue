<!--
	WikiLambda Vue wrapper component for the CodeMirror extension
	https://www.mediawiki.org/wiki/Extension:CodeMirror

	Selected by CodeEditor.vue when $wgWikiLambdaUseCodeMirror is true.

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
const { defineComponent, computed, ref, shallowRef, watch } = require( 'vue' );
const PlainTextEditor = require( './PlainTextEditor.vue' );
const {
	customElementDefinitions,
	findHtmlProblems
} = require( '../../utils/htmlValidationUtils.js' );

// The modules needed to build the editor. The mode module loads on demand.
const CODE_MIRROR_MODULES = [ 'ext.CodeMirror.VueComponent', 'ext.CodeMirror.lib' ];

// The editor starts at five rows and grows to twenty.
const MIN_ROWS = 5;
const MAX_ROWS = 20;

// The mode to use before the user selects a programming language.
const DEFAULT_MODE = 'javascript';

// Finds the name of the implementation function, for example Z12345 in
// "function Z12345( Z12345K1 ) {". The declaration must start the line, so
// that a nested function does not match.
const IMPLEMENTATION_FUNCTION = /^function\s+(Z\d+)\s*\(/m;

/**
 * Gives the ESLint rules to add to the CodeMirror defaults in JavaScript mode.
 *
 * The orchestrator calls the implementation function, so the code does not
 * use it. Thus no-unused-vars ignores the name of that function only. ESLint
 * still checks all other variables and the arguments.
 *
 * @param {string|null} name Name of the implementation function, if found
 * @return {Object} ESLint configuration
 */
function getJavaScriptLintConfig( name ) {
	if ( !name ) {
		// An empty configuration restores the CodeMirror defaults.
		return { rules: {} };
	}
	return {
		rules: {
			'no-unused-vars': [ 1, { varsIgnorePattern: `^${ name }$` } ]
		}
	};
}

// CodeMirror lets the user pick a theme. Lock it to the plain one. CodeMirror
// still follows the skin's dark mode, because it adds the '-light' or '-dark'
// suffix itself.
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
		 * The rules run on the whole document, because CodeMirror puts a
		 * diagnostic at an offset.
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

		// The ESLint worker of the editor. It is null in other modes.
		let javaScriptWorker = null;

		const implementationName = computed( () => {
			const match = IMPLEMENTATION_FUNCTION.exec( props.value );
			return match ? match[ 1 ] : null;
		} );

		/**
		 * Sends the ESLint rules for the current implementation name to the
		 * JavaScript worker.
		 */
		function updateJavaScriptLinter() {
			const worker = javaScriptWorker;
			if ( !worker ) {
				return;
			}
			worker.onload( () => worker.setConfig(
				getJavaScriptLintConfig( implementationName.value )
			) );
		}

		// The user can rename the function, so update the rules each time.
		watch( implementationName, updateJavaScriptLinter );

		/**
		 * Adds the rules for the mode once CodeMirror is ready. CodeMirror
		 * rebuilds the editor when the mode changes, so this runs again after
		 * every change.
		 *
		 * @param {Object} codeMirror The CodeMirror instance
		 */
		function onReady( codeMirror ) {
			javaScriptWorker = null;
			if ( editorMode.value === 'javascript' ) {
				javaScriptWorker = ( codeMirror.langExtension && codeMirror.langExtension.worker ) || null;
				updateJavaScriptLinter();
				return;
			}
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
