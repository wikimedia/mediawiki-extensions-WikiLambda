<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin: string input field.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-text-input
		class="ext-wikilambda-app-function-input-string"
		:disabled="shouldUseDefaultValue"
		:placeholder="placeholder"
		:model-value="value"
		@update:model-value="handleInput"
	></cdx-text-input>
</template>

<script>
const { defineComponent } = require( 'vue' );

// Codex components
const { CdxTextInput } = require( '../../../../codex.js' );

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
		},
		shouldUseDefaultValue: {
			type: Boolean,
			required: false,
			default: false
		},
		defaultValue: {
			type: String,
			required: false,
			default: ''
		}
	},
	emits: [ 'update', 'input', 'validate' ],
	computed: {
		/**
		 * Returns the placeholder text.
		 * If the default value checkbox is checked, return the default value,
		 * otherwise return the default placeholder text.
		 *
		 * @return {string}
		 */
		placeholder: function () {
			if ( this.shouldUseDefaultValue ) {
				return this.defaultValue;
			}
			return this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-string-input-placeholder' ).text();
		}
	},
	methods: {
		/**
		 * Handles the update model value event and emits:
		 * * 'input' event, to set the local value of the field
		 * * 'update' event, to set the value in the store and make it available for VE
		 *
		 * @param {string} value - The new value to emit.
		 */
		handleInput: function ( value ) {
			this.$emit( 'input', value );
			this.$emit( 'update', value );
		}

	},
	mounted: function () {
		this.$emit( 'validate', { isValid: true } );
	}
} );
</script>
