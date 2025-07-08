<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin: enum select box.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-select
		class="ext-wikilambda-app-function-input-enum"
		:selected="value"
		:disabled="!enumValues.length"
		:menu-items="enumValues"
		:menu-config="selectConfig"
		:default-label="$i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-enum-selector-placeholder' ).text()"
		@update:selected="handleUpdate"
		@load-more="handleLoadMoreSelect"
		@blur="handleBlur"
	></cdx-select>
</template>

<script>
const { CdxSelect } = require( '../../../codex.js' );
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );
const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const typeUtils = require( '../../utils/typeUtils.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-input-enum',
	components: {
		'cdx-select': CdxSelect
	},
	props: {
		value: {
			type: String,
			required: false,
			default: ''
		},
		inputType: {
			type: String,
			required: true
		}
	},
	emits: [ 'update', 'input', 'validate' ],
	data: function () {
		return {
			selectConfig: {
				visibleItemLimit: 5
			}
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getEnumValues'
	] ), {
		/**
		 * Returns the menu items for the enum selector.
		 * By passing selected Zid to getEnumValues getter, it will manually
		 * include this item in the enum list if:
		 * * it's not part of the first page of enum values
		 * * it's a valid instance of the enum type
		 *
		 * @return {Array}
		 */
		enumValues: function () {
			return this.getEnumValues( this.inputType, this.value ).map( ( item ) => ( {
				value: item.page_title,
				label: item.label
			} ) );
		},
		/**
		 * Whether this input type allows for empty fields
		 *
		 * @return {boolean}
		 */
		allowsEmptyField: function () {
			return Constants.VE_ALLOW_EMPTY_FIELD.includes( this.inputType );
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'fetchEnumValues'
	] ), {
		/**
		 * Load more values for the enumeration selector when the user scrolls to the bottom of the list
		 * and there are more results to load.
		 */
		handleLoadMoreSelect: function () {
			this.fetchEnumValues( { type: this.inputType } );
		},
		/**
		 * Handles the blur event and validates the current value.
		 */
		handleBlur: function () {
			this.validate( this.value );
		},
		/**
		 * Handles the update event and validates the new value.
		 *
		 * @param {string} value - The new value to validate.
		 */
		handleUpdate: function ( value ) {
			this.$emit( 'input', value );
			this.validate( value, true );
		},
		/**
		 * Updates the validation state of the field.
		 *
		 * @param {boolean} isValid - The validation result.
		 */
		updateValidationState: function ( isValid ) {
			const errorMessage = !isValid ? this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-error-enum' ).text() : undefined;
			this.$emit( 'validate', { isValid, errorMessage } );
		},
		/**
		 * Validates the value and optionally emits an update event if valid.
		 *
		 * @param {string} value - The value to validate.
		 * @param {boolean} emitUpdate - Whether to emit the update event if valid.
		 */
		validate: function ( value, emitUpdate = false ) {
			const isValid = this.isValid( value );
			this.updateValidationState( isValid );

			if ( emitUpdate && isValid ) {
				this.$emit( 'update', value );
			}
		},
		/**
		 * Check if the enum is a valid zid format and exists in enum values.
		 *
		 * @param {string} value - The value to validate.
		 * @return {boolean} - True if the value is valid, otherwise false.
		 */
		isValid: function ( value ) {
			if ( !value && this.allowsEmptyField ) {
				return true;
			}
			return typeUtils.isValidZidFormat( value ) && this.isValueInEnumValues( value );
		},
		/**
		 * Checks if the given value exists in the enum values.
		 *
		 * @param {string} value - The value to check.
		 * @return {boolean} - True if the value exists, otherwise false.
		 */
		isValueInEnumValues: function ( value ) {
			return this.enumValues.some( ( item ) => item.value === value );
		},
		/**
		 * Fetches all enum values for the input type
		 */
		fetchAndValidateEnumValues: function () {
			// Fetch 20 enum values which usually is enough to show all enums directly
			this.fetchEnumValues( { type: this.inputType, limit: 20 } ).then( () => {
				if ( !this.enumValues.length ) {
					return;
				}
				this.validate( this.value );
			} );
		}
	} ),
	watch: {
		/**
		 * Watcher for `enumValues` to ensure that validation is performed
		 * only after the enum values are updated in the store. This is necessary
		 * because the `fetchEnumValues` action in `fetchAndValidateEnumValues` is asynchronous,
		 * and the `enumValues` computed property may not be immediately populated when the fetch completes.
		 * By watching `enumValues`, we can trigger validation once the values are
		 * available, ensuring that the component behaves correctly in editing mode.
		 *
		 * @param {Array} newEnumValues - The updated list of enum values.
		 */
		enumValues: function ( newEnumValues ) {
			if ( newEnumValues.length ) {
				this.validate( this.value );
			}
		}
	},
	mounted: function () {
		this.fetchAndValidateEnumValues();
	}
} );
</script>

<style lang="less">
.ext-wikilambda-app-function-input-enum {
	width: 100%;
}
</style>
