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
const { defineComponent, inject, computed, onMounted } = require( 'vue' );

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
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );

		/**
		 * Returns the placeholder text.
		 * If the default value checkbox is checked, return the default value,
		 * otherwise return the default placeholder text.
		 *
		 * @return {string}
		 */
		const placeholder = computed( () => {
			if ( props.shouldUseDefaultValue ) {
				return props.defaultValue;
			}
			return i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-string-input-placeholder' ).text();
		} );
		/**
		 * Handles the update model value event and emits:
		 * * 'input' event, to set the local value of the field
		 * * 'update' event, to set the value in the store and make it available for VE
		 *
		 * @param {string} value - The new value to emit.
		 */
		const handleInput = ( value ) => {
			emit( 'input', value );
			emit( 'update', value );
		};

		onMounted( () => {
			emit( 'validate', { isValid: true } );
		} );

		return {
			handleInput,
			placeholder
		};
	}
} );
</script>
