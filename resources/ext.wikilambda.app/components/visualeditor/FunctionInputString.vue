<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin: string input field.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-text-input
		:disabled="false"
		:placeholder="$i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-string-input-placeholder' )"
		:model-value="value"
		@update:model-value="handleInput"
		@change="handleChange"
	></cdx-text-input>
</template>

<script>
const { CdxTextInput } = require( '../../../codex.js' );
const { defineComponent } = require( 'vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-input-string',
	components: {
		'cdx-text-input': CdxTextInput
	},
	inheritAttrs: false,
	props: {
		value: {
			type: String,
			required: false,
			default: ''
		}
	},
	emits: [ 'update', 'input', 'validate' ],
	methods: {
		/**
		 * Handles the update model value event and emits the new value.
		 *
		 * @param {string} value - The new value to emit.
		 */
		handleInput: function ( value ) {
			this.$emit( 'input', value );
		},
		/**
		 * Handles the change event and emits the new value.
		 *
		 * @param {Event} event - The change event triggered by the input field.
		 */
		handleChange: function ( event ) {
			this.$emit( 'update', event.target.value );
		}

	},
	mounted: function () {
		this.$emit( 'validate', { isValid: true } );
	}
} );
</script>
