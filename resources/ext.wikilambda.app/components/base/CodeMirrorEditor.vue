<!--
	WikiLambda Vue wrapper component for the CodeMirror extension
	https://www.mediawiki.org/wiki/Extension:CodeMirror

	Selected by CodeEditor.vue when the CodeMirror extension is installed.

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
			:theme="theme"
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
const { defineComponent, computed, inject, ref, shallowRef, watch } = require( 'vue' );
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

// The evaluators give the implementation code these names.
const EVALUATOR_GLOBALS = {
	Wikifunctions: 'readonly',
	ZObject: 'readonly',
	ZReference: 'readonly',
	ZPair: 'readonly'
};

// The methods of the Wikifunctions object that the user can call. Each
// suggestion adds the parameters of the method, in the style of the language.
// The last field of each template moves the cursor after the call.
const WIKIFUNCTIONS_METHODS = [
	{
		name: 'Call',
		description: 'wikilambda-codeeditor-wikifunctions-call-description',
		javascript: { template: "Call( '${zid}', ${args} )${}", detail: '(zid, ...args)' },
		python: { template: 'Call("${zid}", ${args})${}', detail: '(zid, *args)' }
	},
	{
		name: 'Error',
		description: 'wikilambda-codeeditor-wikifunctions-error-description',
		javascript: { template: "Error( '${errorType}', [ ${errorArgs} ] )${}", detail: '(errorType, errorArgs)' },
		python: { template: 'Error("${error_type}", [${error_args}])${}', detail: '(error_type, error_args)' }
	},
	{
		name: 'Debug',
		description: 'wikilambda-codeeditor-wikifunctions-debug-description',
		javascript: { template: 'Debug( ${message} )${}', detail: '(message)' },
		python: { template: 'Debug(${message})${}', detail: '(message)' }
	}
];

// The syntax nodes of strings and comments in JavaScript and Python. The
// editor does not suggest the Wikifunctions methods in them.
const NO_SUGGESTION_NODES = [
	'String',
	'TemplateString',
	'FormatString',
	'RegExp',
	'LineComment',
	'BlockComment',
	'Comment'
];

/**
 * Gives the ESLint configuration to add to the CodeMirror defaults in
 * JavaScript mode.
 *
 * The evaluators give the code the names in EVALUATOR_GLOBALS. Tell ESLint
 * that these names are read-only globals, so that no-undef does not report
 * them. Each call to setConfig() replaces the previous configuration, so each
 * call sends the globals.
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
		// An empty rules object gives the CodeMirror default rules.
		return { globals: EVALUATOR_GLOBALS, rules: {} };
	}
	return {
		globals: EVALUATOR_GLOBALS,
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
		const i18n = inject( 'i18n' );

		// State
		const editorComponent = shallowRef( null );
		const lib = shallowRef( null );
		const loadFailed = ref( false );

		// CodeMirror needs a mode, but the language is empty until the user
		// picks one. The editor is disabled until then, so the mode is unseen.
		const editorMode = computed( () => props.mode || DEFAULT_MODE );

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

		/**
		 * Makes the information panel for a Wikifunctions method: the
		 * description of the method and a link to the documentation.
		 *
		 * @param {string} description Message key of the description
		 * @return {HTMLElement} Contents of the information panel
		 */
		function getWikifunctionsMethodInfo( description ) {
			const info = document.createElement( 'div' );
			info.append( i18n( description ).text(), ' ' );
			const link = document.createElement( 'a' );
			link.href = i18n( 'wikilambda-editor-howto-implementation-link' ).text();
			// Open the link in a new tab, so that the user does not leave the editor.
			link.target = '_blank';
			link.rel = 'noopener';
			link.textContent = i18n( 'wikilambda-editor-howto-implementation-text' ).text();
			info.append( link );
			return info;
		}

		/**
		 * Suggests the methods of the Wikifunctions object after the user
		 * types "Wikifunctions.". Each suggestion adds the parameters of the
		 * method.
		 *
		 * @param {Object} context CodeMirror completion context
		 * @return {Object|null} CodeMirror completion result, or null for no match
		 */
		function getWikifunctionsCompletions( context ) {
			const before = context.matchBefore( /\bWikifunctions\.[A-Za-z]*/ );
			if ( !before ) {
				return null;
			}
			const { snippetCompletion } = lib.value;
			return {
				// Keep "Wikifunctions.", and replace only the method name after it.
				from: before.from + 'Wikifunctions.'.length,
				options: WIKIFUNCTIONS_METHODS.map( ( method ) => {
					const { template, detail } = method[ editorMode.value ];
					return snippetCompletion( template, {
						label: method.name,
						detail: detail,
						type: 'method',
						// When the user asks for suggestions in Python, the
						// built-in Python names also fill the list. Put the
						// methods at the top.
						boost: 99,
						info: () => getWikifunctionsMethodInfo( method.description )
					} );
				} )
			};
		}

		/**
		 * Gives the completion source for the mode of the editor.
		 *
		 * @return {Function|null} CodeMirror completion source, or null if the
		 *  mode has no suggestions
		 */
		function getCompletionSource() {
			if ( editorMode.value === 'html' ) {
				return getCustomElementCompletions;
			}
			if ( editorMode.value === 'javascript' || editorMode.value === 'python' ) {
				return lib.value.ifNotIn( NO_SUGGESTION_NODES, getWikifunctionsCompletions );
			}
			return null;
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
		 * Adds the rules and the suggestions for the mode once CodeMirror is
		 * ready. CodeMirror rebuilds the editor when the mode changes, so this
		 * runs again after every change.
		 *
		 * @param {Object} codeMirror The CodeMirror instance
		 */
		function onReady( codeMirror ) {
			javaScriptWorker = null;
			if ( editorMode.value === 'javascript' ) {
				javaScriptWorker = ( codeMirror.langExtension && codeMirror.langExtension.worker ) || null;
				updateJavaScriptLinter();
			}
			if ( editorMode.value === 'html' ) {
				codeMirror.applyLinter( getHtmlDiagnostics );
			}

			const source = getCompletionSource();
			if ( !source ) {
				return;
			}
			const language = codeMirror.view.state.facet( lib.value.language );
			if ( language ) {
				codeMirror.applyExtension( language.data.of( {
					// Suggestions are of no use in an editor the user cannot
					// type in. CodeMirror does not send 'ready' again when the
					// editor becomes editable, so check at each request.
					autocomplete: ( context ) => ( props.readOnly || props.disabled ) ?
						null :
						source( context )
				} ) );
			}
		}

		return {
			editorComponent,
			editorMode,
			loadFailed,
			theme: DEFAULT_THEME,
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
