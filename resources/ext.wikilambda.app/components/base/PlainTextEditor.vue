<!--
	WikiLambda Vue component: plain textarea, with no syntax highlighting.

	Selected by CodeEditor.vue when $wgWikiLambdaUseCodeMirror is false, or when
	CodeMirror is not installed. CodeMirrorEditor.vue also uses it if the
	CodeMirror modules do not load.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<textarea
		class="ext-wikilambda-app-plain-text-editor"
		data-testid="plain-code-editor"
		:value="value"
		:rows="rows"
		:readonly="readOnly || disabled"
		:disabled="disabled"
		@input="$emit( 'change', $event.target.value )"
	></textarea>
</template>

<script>
const { defineComponent } = require( 'vue' );

module.exports = exports = defineComponent( {
	name: 'wl-plain-text-editor',
	props: {
		value: {
			type: String,
			default: ''
		},
		rows: {
			type: Number,
			default: 10
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
	emits: [ 'change' ]
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-plain-text-editor {
	width: 100%;
	min-height: 85px;
	box-sizing: @box-sizing-base;
	border: 1px solid @border-color-subtle;
	font-family: monospace, monospace;
	font-size: calc( @font-size-medium * 0.857 );

	&:disabled {
		background-color: @background-color-disabled-subtle;
	}
}
</style>
