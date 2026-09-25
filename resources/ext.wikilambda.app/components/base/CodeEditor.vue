<!--
	WikiLambda Vue component: the code editor the app uses.

	Two configuration flags select the editor:
	* $wgWikiLambdaUseCodeMirror uses the CodeMirror extension.
	* $wgWikiLambdaUseCodeEditor uses the ACE editor that WikiLambda bundles.
	CodeMirror wins if both are true. A plain textarea is used if both are
	false, or if CodeMirror is asked for but the extension is not installed and
	ACE is off.

	Every editor has the same props and the same 'change' event.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<component
		:is="editorComponent"
		v-bind="editorProps"
		@change="$emit( 'change', $event )"
	></component>
</template>

<script>
const { defineComponent, computed } = require( 'vue' );
const AceEditor = require( './AceEditor.vue' );
const CodeMirrorEditor = require( './CodeMirrorEditor.vue' );
const PlainTextEditor = require( './PlainTextEditor.vue' );
const config = require( '../../config.json' );

// The ResourceLoader module that CodeMirrorEditor.vue needs. CodeMirror is an
// optional dependency, so the module is absent if it is not installed.
const CODE_MIRROR_MODULE = 'ext.CodeMirror.VueComponent';

/**
 * Selects the editor to use. This does not change while the page is open.
 *
 * @return {Object} A Vue component
 */
function getEditorComponent() {
	// getState() gives null if the module is not registered.
	if ( config.WikiLambdaUseCodeMirror && mw.loader.getState( CODE_MIRROR_MODULE ) ) {
		return CodeMirrorEditor;
	}
	if ( config.WikiLambdaUseCodeEditor ) {
		return AceEditor;
	}
	return PlainTextEditor;
}

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
	setup( props ) {
		const editorComponent = getEditorComponent();

		// A plain textarea has no mode and no theme. Do not give it these, or
		// they become attributes of the textarea element.
		const editorProps = computed( () => Object.assign(
			{
				value: props.value,
				readOnly: props.readOnly,
				disabled: props.disabled
			},
			editorComponent === PlainTextEditor ?
				{} :
				{ mode: props.mode, theme: props.theme }
		) );

		return {
			editorComponent,
			editorProps
		};
	}
} );
</script>
