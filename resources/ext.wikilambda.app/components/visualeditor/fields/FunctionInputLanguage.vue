<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin: language lookup field.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-z-object-selector
		class="ext-wikilambda-app-function-input-language"
		:selected-zid="value"
		:placeholder="placeholder"
		:type="languageType"
		:disabled="shouldUseDefaultValue"
		@select-item="handleUpdate"
	></wl-z-object-selector>
</template>

<script>
const { defineComponent, ref, computed, onMounted, watch } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const ErrorData = require( '../../../store/classes/ErrorData.js' );
const typeUtils = require( '../../../utils/typeUtils.js' );
const zobjectUtils = require( '../../../utils/zobjectUtils.js' );

// Base components
const ZObjectSelector = require( '../../base/ZObjectSelector.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-input-language',
	components: {
		'wl-z-object-selector': ZObjectSelector
	},
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
		const store = useMainStore();

		const isValidating = ref( false );
		const languageType = Constants.Z_NATURAL_LANGUAGE;

		/**
		 * Updates the validation state
		 *
		 * @param {boolean} isValid
		 */
		const placeholder = computed( () => {
			if ( props.shouldUseDefaultValue ) {
				const defaultValueId = props.defaultValue;
				if ( !defaultValueId ) {
					return '';
				}
				// Get the language label using the store's getLabelData method
				const labelData = store.getLabelData( defaultValueId );
				return labelData ? labelData.label : defaultValueId;
			}
			return '';
		} );

		/**
		 * Whether this input type allows for empty fields
		 *
		 * @return {boolean}
		 */
		const allowsEmptyField = Constants.VE_ALLOW_EMPTY_FIELD.includes( Constants.Z_NATURAL_LANGUAGE );

		/**
		 * Updates the validation state of the field by emitting a 'validate'
		 * event with the result of the validation and the error message (if any)
		 *
		 * @param {boolean} isValid - The validation result.
		 */
		function updateValidationState( isValid ) {
			const errorMessageKey = 'wikilambda-visualeditor-wikifunctionscall-error-language';
			const error = !isValid ? ErrorData.buildErrorData( { errorMessageKey } ) : undefined;
			emit( 'validate', { isValid, error } );
		}

		/**
		 * Fetches the selected zid and validates it
		 *
		 * @param {string} zid
		 * @param {boolean} emitUpdate
		 */
		function validateLanguage( zid, emitUpdate ) {
			// Set validating flag and emit invalid until we get a response
			isValidating.value = true;
			emit( 'validate', { isValid: false } );

			store.fetchZids( { zids: [ zid ] } )
				.then( () => {
					// If zid does not exist; not valid
					const selectedObject = store.getStoredObject( zid );
					if ( !selectedObject ) {
						updateValidationState( false );
						return;
					}

					// Check if zid belongs to a language
					const innerObject = selectedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
					const innerType = typeUtils.typeToString( zobjectUtils.getZObjectType( innerObject ), true );
					const isValidLang = innerType === Constants.Z_NATURAL_LANGUAGE;

					updateValidationState( isValidLang );
					if ( emitUpdate && isValidLang ) {
						emit( 'update', zid );
					}
				} )
				.catch( () => {
					// Fetch failed, set as non valid
					updateValidationState( false );
				} )
				.finally( () => {
					// Unset validating flag
					isValidating.value = false;
				} );
		}

		/**
		 * Validates the value
		 *
		 * @param {string} value
		 * @param {boolean} emitUpdate
		 */
		function validate( value, emitUpdate = false ) {

			// If default value checkbox is checked, field is valid
			if ( props.shouldUseDefaultValue ) {
				updateValidationState( true );
				if ( emitUpdate ) {
					emit( 'update', value );
				}
				return;
			}

			// If value is empty; valid if: empty is allowed AND no default value available
			if ( !value ) {
				const isValid = allowsEmptyField && !props.hasDefaultValue;
				updateValidationState( isValid );
				if ( emitUpdate && isValid ) {
					emit( 'update', value );
				}
				return;
			}

			// If value is not a zid; not valid
			if ( !typeUtils.isValidZidFormat( value ) ) {
				updateValidationState( false );
				return;
			}

			// Else, initiate asynchronous validation
			validateLanguage( value, emitUpdate );
		}

		/**
		 * Handles the update event
		 *
		 * @param {string} value
		 */
		function handleUpdate( value ) {
			emit( 'input', value );
			validate( value, true );
		}

		/**
		 * Fetches suggested languages
		 */
		function fetchSuggestedLangs() {
			store.fetchZids( { zids: Constants.SUGGESTIONS.LANGUAGES } );
		}

		/**
		 * Watch for changes to shouldUseDefaultValue and re-validate
		 *
		 * @param {string} value
		 * @param {boolean} emitUpdate
		 */
		watch( () => props.shouldUseDefaultValue, () => {
			validate( props.value );
		} );

		onMounted( () => {
			fetchSuggestedLangs();
			validate( props.value );
		} );

		return {
			handleUpdate,
			languageType,
			placeholder
		};
	}
} );
</script>
