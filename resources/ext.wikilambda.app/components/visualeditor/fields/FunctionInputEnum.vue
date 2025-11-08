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
		:disabled="shouldUseDefaultValue || !enumValues.length"
		:menu-items="enumValues"
		:menu-config="selectConfig"
		:default-label="placeholder"
		@update:selected="handleUpdate"
		@load-more="handleLoadMoreSelect"
		@blur="handleBlur"
	></cdx-select>
</template>

<script>
const { computed, defineComponent, inject, onMounted, watch } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const ErrorData = require( '../../../store/classes/ErrorData.js' );
const typeUtils = require( '../../../utils/typeUtils.js' );

// Codex components
const { CdxSelect } = require( '../../../../codex.js' );

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
		},
		shouldUseDefaultValue: {
			type: Boolean,
			required: false,
			default: false
		},
		hasDefaultValue: {
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
		const store = useMainStore();

		const selectConfig = {
			visibleItemLimit: 5
		};

		/**
		 * Returns the menu items for the enum selector.
		 *
		 * @return {Array}
		 */
		const enumValues = computed( () => store.getEnumValues( props.inputType, props.value ).map( ( item ) => ( {
			value: item.page_title,
			label: item.label
		} ) ) );

		/**
		 * Whether this input type allows for empty fields
		 *
		 * @return {boolean}
		 */
		const allowsEmptyField = computed( () => Constants.VE_ALLOW_EMPTY_FIELD.includes( props.inputType ) );
		/**
		 * Returns the placeholder text.
		 * If the default value checkbox is checked, return the default value,
		 * otherwise return the default placeholder text.
		 *
		 * @return {string}
		 */
		const placeholder = computed( () => {
			if ( props.shouldUseDefaultValue ) {
				const enumValueZid = props.defaultValue;
				if ( !enumValueZid ) {
					return '';
				}
				const enumValue = enumValues.value.find( ( item ) => item.value === enumValueZid );
				return enumValue ? enumValue.label : enumValueZid;
			}
			return i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-enum-selector-placeholder' ).text();
		} );
		/**
		 * Checks if the given value exists in the enum values.
		 *
		 * @param {string} value - The value to check.
		 * @return {boolean} - True if the value exists, otherwise false.
		 */
		const isValueInEnumValues = ( value ) => enumValues.value.some( ( item ) => item.value === value );

		/**
		 * Check if the enum is a valid zid format and exists in enum values.
		 *
		 * @param {string} value - The value to validate.
		 * @return {boolean} - True if the value is valid, otherwise false.
		 */
		const isValid = ( value ) => {
			// If default value checkbox is checked, field is valid
			if ( props.shouldUseDefaultValue ) {
				return true;
			}
			// If value is empty; valid if empty is allowed AND no default value available
			if ( !value && allowsEmptyField.value && !props.hasDefaultValue ) {
				return true;
			}
			return typeUtils.isValidZidFormat( value ) && isValueInEnumValues( value );
		};

		/**
		 * Updates the validation state of the field.
		 *
		 * @param {boolean} isValidValue - The validation result.
		 */
		const updateValidationState = ( isValidValue ) => {
			const errorMessageKey = 'wikilambda-visualeditor-wikifunctionscall-error-enum';
			const error = !isValidValue ? ErrorData.buildErrorData( { errorMessageKey } ) : undefined;
			emit( 'validate', { isValid: isValidValue, error } );
		};

		/**
		 * Validates the value and optionally emits an update event if valid.
		 *
		 * @param {string} value - The value to validate.
		 * @param {boolean} emitUpdate - Whether to emit the update event if valid.
		 */
		const validate = ( value, emitUpdate = false ) => {
			const isValidValue = isValid( value );
			updateValidationState( isValidValue );

			if ( emitUpdate && isValidValue ) {
				emit( 'update', value );
			}
		};

		/**
		 * Load more values for the enumeration selector
		 */
		const handleLoadMoreSelect = () => {
			store.fetchEnumValues( { type: props.inputType } );
		};

		/**
		 * Handles the blur event and validates the current value.
		 */
		const handleBlur = () => {
			validate( props.value );
		};

		/**
		 * Handles the update event
		 *
		 * @param {string} value - The new value to validate.
		 */
		const handleUpdate = ( value ) => {
			emit( 'input', value );
			validate( value, true );
		};

		/**
		 * Fetches all enum values for the input type
		 */
		const fetchAndValidateEnumValues = () => {
			store.fetchEnumValues( { type: props.inputType, limit: Constants.API_ENUMS_FIRST_LIMIT } )
				.then( () => {
					if ( !enumValues.value.length ) {
						return;
					}
					validate( props.value );
				} );
		};

		/**
		 * Watcher for `enumValues` to ensure validation after store update
		 */
		watch( enumValues, ( newEnumValues ) => {
			if ( newEnumValues.length ) {
				validate( props.value );
			}
		} );

		/**
		 * Watch for changes to shouldUseDefaultValue and re-validate
		 *
		 * @param {boolean} newValue - The new value of shouldUseDefaultValue
		 */
		watch( () => props.shouldUseDefaultValue, () => {
			validate( props.value );
		} );

		onMounted( () => {
			fetchAndValidateEnumValues();
		} );

		return {
			enumValues,
			handleBlur,
			handleLoadMoreSelect,
			handleUpdate,
			placeholder,
			selectConfig
		};
	}
} );
</script>
