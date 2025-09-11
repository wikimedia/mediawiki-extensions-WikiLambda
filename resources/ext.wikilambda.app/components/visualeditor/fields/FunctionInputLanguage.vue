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
		:type="languageType"
		:disabled="shouldUseDefaultValue"
		:placeholder="placeholder"
		@select-item="handleUpdate"
	></wl-z-object-selector>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

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
	data: function () {
		return {
			isValidating: false,
			languageType: Constants.Z_NATURAL_LANGUAGE
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLabelData',
		'getStoredObject'
	] ), {
		/**
		 * Whether this input type allows for empty fields
		 *
		 * @return {boolean}
		 */
		allowsEmptyField: function () {
			return Constants.VE_ALLOW_EMPTY_FIELD.includes( Constants.Z_NATURAL_LANGUAGE );
		},

		/**
		 * Returns the placeholder text.
		 * If the default value checkbox is checked, return the default value label,
		 * otherwise return an empty string.
		 *
		 * @return {string}
		 */
		placeholder: function () {
			if ( this.shouldUseDefaultValue ) {
				const langZid = this.defaultValue;
				if ( !langZid ) {
					return '';
				}
				// Get the language label using the store's getLabelData method
				const labelData = this.getLabelData( langZid );
				return labelData ? labelData.label : langZid;
			}
			return '';
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'fetchZids'
	] ), {
		/**
		 * Handles the update event:
		 * * emits 'input' event to set the local variable to the new value
		 * * starts validation, which will emit 'update' event to set up the
		 *   value in the store and make it available to VE
		 *
		 * @param {string} value - The new value to validate.
		 */
		handleUpdate: function ( value ) {
			this.$emit( 'input', value );
			this.validate( value, true );
		},

		/**
		 * Updates the validation state of the field by emitting a 'validate'
		 * event with the result of the validation and the error message (if any)
		 *
		 * @param {boolean} isValid - The validation result.
		 */
		updateValidationState: function ( isValid ) {
			const errorMessageKey = 'wikilambda-visualeditor-wikifunctionscall-error-language';
			const error = !isValid ? ErrorData.buildErrorData( { errorMessageKey } ) : undefined;
			this.$emit( 'validate', { isValid, error } );
		},

		/**
		 * Validates the value and optionally emits an update event if valid.
		 * When validation is done:
		 * * emits 'validate' event with the final validation result
		 * * emits 'update' event with the value if emitUpdate flag is true and validation is successful
		 *
		 * @param {string} value - The value to validate.
		 * @param {boolean} emitUpdate - Whether to emit the update event if valid.
		 */
		validate: function ( value, emitUpdate = false ) {
			// If default value checkbox is checked, field is valid
			if ( this.shouldUseDefaultValue ) {
				this.updateValidationState( true );
				if ( emitUpdate ) {
					this.$emit( 'update', value );
				}
				return;
			}

			// If value is empty; valid if: empty is allowed AND no default value available
			if ( !value ) {
				const isValid = this.allowsEmptyField && !this.hasDefaultValue;
				this.updateValidationState( isValid );
				if ( emitUpdate && isValid ) {
					this.$emit( 'update', value );
				}
				return;
			}

			// If value is not a zid; not valid
			if ( !typeUtils.isValidZidFormat( value ) ) {
				this.updateValidationState( false );
				return;
			}

			// Else, initiate asynchronous validation
			this.validateLanguage( value, emitUpdate );
		},

		/**
		 * Fetches the selected zid and validate that it belongs to a Natural Language.
		 *
		 * @param {string} zid - Zid to validate as an instance of Natural Language
		 * @param {boolean} emitUpdate - Whether to emit the update event if valid.
		 */
		validateLanguage: function ( zid, emitUpdate ) {
			// Set validating flag and emit invalid until we get a response
			this.isValidating = true;
			this.$emit( 'validate', { isValid: false } );

			this.fetchZids( { zids: [ zid ] } )
				.then( () => {
					// If zid does not exist; not valid
					const selectedObject = this.getStoredObject( zid );
					if ( !selectedObject ) {
						this.updateValidationState( false );
					}

					// Check if zid belongs to a language
					const innerObject = selectedObject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
					const innerType = typeUtils.typeToString( zobjectUtils.getZObjectType( innerObject ), true );
					const isValidLang = innerType === Constants.Z_NATURAL_LANGUAGE;

					this.updateValidationState( isValidLang );
					if ( emitUpdate && isValidLang ) {
						this.$emit( 'update', zid );
					}
				} )
				.catch( () => {
					// Fetch failed, set as non valid
					this.updateValidationState( false );
				} )
				.finally( () => {
					// Unset validating flag
					this.isValidating = false;
				} );
		},

		/**
		 * On field initialization, make sure suggested languages are fetched
		 */
		fetchSuggestedLangs: function () {
			this.fetchZids( { zids: Constants.SUGGESTIONS.LANGUAGES } );
		}

	} ),
	watch: {
		/**
		 * Watch for changes to shouldUseDefaultValue and re-validate
		 *
		 * @param {boolean} newValue - The new value of shouldUseDefaultValue
		 */
		shouldUseDefaultValue: function () {
			this.validate( this.value );
		}
	},
	mounted: function () {
		this.fetchSuggestedLangs();
		this.validate( this.value );
	}
} );
</script>
