<!--
	WikiLambda Vue component for Z89/HTML Fragment objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-html-fragment" data-testid="z-html-fragment">
		<code-editor
			v-if="!edit && value"
			class="ext-wikilambda-app-html-fragment__code-editor"
			mode="html"
			:read-only="true"
			:disabled="true"
			:value="value"
			data-testid="html-fragment-editor-read"
		></code-editor>
		<code-editor
			v-else
			class="ext-wikilambda-app-html-fragment__code-editor"
			mode="html"
			:read-only="false"
			:disabled="disabled"
			:value="editorValue"
			data-testid="html-fragment-editor-edit"
			@change="setValue"
		></code-editor>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const zobjectMixin = require( '../../mixins/zobjectMixin.js' );
const errorMixin = require( '../../mixins/errorMixin.js' );

// Base components
const CodeEditor = require( '../base/CodeEditor.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-z-code',
	components: {
		'code-editor': CodeEditor
	},
	mixins: [ errorMixin, zobjectMixin ],
	props: {
		keyPath: { // eslint-disable-line vue/no-unused-properties
			type: String,
			required: true
		},
		objectValue: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			editorValue: '',
			allowSetEditorValue: true
		};
	},
	computed: {
		/**
		 * Returns the value of the selected reference.
		 *
		 * @return {string}
		 */
		value: function () {
			return this.getZHTMLFragmentTerminalValue( this.objectValue );
		}
	},
	methods: {
		/**
		 * Updates the value of the HTML fragment value (Z89K1)
		 *
		 * @param {string} value
		 */
		setValue: function ( value ) {
			/**
			 * Update the value of the HTML fragment (Z89K1) with the new value.
			 *
			 * There is an edge case where acejs will trigger an empty change that we process as an event object
			 * we don't want to update our object with that bad data
			 * TODO (T324605): this deserves a deeper investigation
			 *
			 * If there is an error, we do not emit the 'set-value' event.
			 * This is to prevent the code editor from being updated with an invalid value.
			 */
			if ( typeof value !== 'object' ) {
				this.$emit( 'set-value', {
					keyPath: [ Constants.Z_HTML_FRAGMENT_VALUE, Constants.Z_STRING_VALUE ],
					value
				} );
			}
		}

	},
	watch: {
		value: {
			immediate: true,
			handler: function () {
				// Check allowSetEditorValue to ensure we only set value in the editor when its current value should be
				// overridden (e.g. when the editor is first loaded). Ensuring this
				// prevents a bug that moves the cursor to the end of the editor on every keypress.
				if ( this.allowSetEditorValue ) {
					this.editorValue = this.value || '';
					this.allowSetEditorValue = false;
				}
			}
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-code {
	.ext-wikilambda-app-code__language-selector {
		margin-top: @spacing-25;
		margin-bottom: @spacing-50;
	}

	.ext-wikilambda-app-code__inline-error {
		margin-top: @spacing-25;
	}
}
</style>
