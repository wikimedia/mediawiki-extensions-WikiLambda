<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin: Wikidata input field.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-input-wikidata">
		<wl-wikidata-entity-selector
			:entity-id="entityId"
			:entity-label="entityLabel"
			:type="entityType"
			:disabled="shouldUseDefaultValue"
			:placeholder="placeholder"
			@select-wikidata-entity="onSelect"
		></wl-wikidata-entity-selector>
		<cdx-progress-indicator
			v-if="isValidating"
			class="ext-wikilambda-app-function-input-wikidata__progress-indicator">
			{{ i18n( 'wikilambda-loading' ).text() }}
		</cdx-progress-indicator>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const ErrorData = require( '../../../store/classes/ErrorData.js' );

// Wikidata components
const WikidataEntitySelector = require( '../../types/wikidata/EntitySelector.vue' );
// Codex components
const { CdxProgressIndicator } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-input-wikidata',
	components: {
		'wl-wikidata-entity-selector': WikidataEntitySelector,
		'cdx-progress-indicator': CdxProgressIndicator
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
	emits: [ 'input', 'update', 'validate' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		// State
		const isValidating = ref( false );

		// Entity data
		/**
		 * Get the Wikidata entity type based on the input type
		 *
		 * @return {string}
		 */
		const entityType = computed( () => Constants.WIKIDATA_SIMPLIFIED_TYPES[ props.inputType ] );

		/**
		 * Get the current entity ID from the value
		 *
		 * @return {string|null}
		 */
		const entityId = computed( () => props.value || null );

		/**
		 * Get the current entity label
		 *
		 * @return {string}
		 */
		const entityLabel = computed( () => {
			const labelData = store.getWikidataEntityLabelData( entityType.value, entityId.value );
			return labelData ? labelData.label : '';
		} );

		// Validation configuration
		/**
		 * Whether this input type allows for empty fields
		 *
		 * @return {boolean}
		 */
		const allowsEmptyField = computed( () => Constants.VE_ALLOW_EMPTY_FIELD.includes( props.inputType ) );

		// Placeholder
		/**
		 * Returns the placeholder text.
		 * If the default value checkbox is checked, return the default value label,
		 * otherwise return an empty string.
		 *
		 * @return {string}
		 */
		const placeholder = computed( () => {
			if ( props.shouldUseDefaultValue ) {
				const defaultValueId = props.defaultValue;
				if ( !defaultValueId ) {
					return '';
				}
				// Get the entity label from the store
				const labelData = store.getWikidataEntityLabelData( entityType.value, defaultValueId );
				return labelData ? labelData.label : defaultValueId;
			}
			return '';
		} );

		// Validation
		/**
		 * Updates the validation state
		 *
		 * @param {boolean} isValid
		 */
		function updateValidationState( isValid ) {
			const simplifiedType = Constants.WIKIDATA_SIMPLIFIED_TYPES[ entityType.value ];
			const errorMessageKey = Constants.WIKIDATA_INPUT_ERROR_MSG[ simplifiedType ];
			const error = !isValid ? ErrorData.buildErrorData( { errorMessageKey } ) : undefined;
			emit( 'validate', { isValid, error } );
		}

		/**
		 * Validates a Wikidata entity ID by checking if it exists and is of the correct type.
		 *
		 * This method performs asynchronous validation using a two-step process:
		 * 1. First attempts to retrieve the entity from the local cache
		 * 2. If not found, fetches the entity from Wikidata and validates again
		 *
		 * The two-step process is necessary because:
		 * - The store manages entity fetching through promises to prevent duplicate API calls
		 * - When fetchWikidataEntitiesByType is called, it first adds a promise to the store
		 * - If the same entity is already being fetched, the existing promise is returned
		 * - If the entity is already cached, the promise resolves immediately
		 * - Only if the entity hasn't been requested yet it makes a new API call
		 * - This prevents race conditions and unnecessary duplicate requests
		 *
		 * During validation:
		 * - Sets the component's validating state to true
		 * - Initially emits an invalid validation state
		 * - Updates validation state to true if entity is found and valid
		 * - Updates validation state to false if entity doesn't exist or is invalid
		 * - Optionally emits an update event if validation succeeds and emitUpdate is true
		 * - Always resets the validating state when complete
		 *
		 * @param {string} entityIdValue - The Wikidata entity ID to validate (e.g., 'Q42', 'L123', 'P31')
		 * @param {boolean} [emitUpdate=false] - Whether to emit an 'update' event if validation succeeds
		 */
		function validateEntity( entityIdValue, emitUpdate = false ) {
			// Set validating state and emit invalid until we get a response
			isValidating.value = true;
			emit( 'validate', { isValid: false } );

			// Helper function to validate and update the validation state
			function validateAndUpdate() {
				updateValidationState( true );
				if ( emitUpdate ) {
					emit( 'update', entityIdValue );
				}
			}

			// First, try to get the entity data asynchronously
			store.getWikidataEntityDataAsync( entityType.value, entityIdValue )
				// If the entity data is not found, fetch it from Wikidata
				.catch( () => store.fetchWikidataEntitiesByType( { type: entityType.value, ids: [ entityIdValue ] } )
					.then( () => store.getWikidataEntityDataAsync( entityType.value, entityIdValue ) )
				)
				// If the entity data is found, validate and update
				.then( validateAndUpdate )
				// If the entity data is not found or there was an error, set the validation state to false
				.catch( () => updateValidationState( false ) )
				.finally( () => {
					isValidating.value = false;
				} );
		}

		/**
		 * Validates the value and optionally emits an update event if valid.
		 *
		 * @param {string} value - The value to validate.
		 * @param {boolean} emitUpdate - Whether to emit the update event if valid.
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

			// For empty values, valid if: empty is allowed AND no default value available
			if ( !value ) {
				const isValid = allowsEmptyField.value && !props.hasDefaultValue;
				updateValidationState( isValid );
				if ( emitUpdate && isValid ) {
					emit( 'update', value );
				}
				return;
			}

			// For non-empty values, validate the entity
			validateEntity( value, emitUpdate );
		}

		// Event handlers
		/**
		 * Handle Wikidata entity selection:
		 * * emits 'input' event to set the local variable to the new value
		 * * starts validation, which will emit 'update' event to set up the
		 *   value in the store and make it available to VE
		 *
		 * @param {string} value - The selected entity ID
		 */
		function onSelect( value ) {
			emit( 'input', value );
			validateEntity( value, true );
		}

		// Data fetching
		/**
		 * Fetches the default value from wikidata.
		 */
		function fetchDefaultValue() {
			if ( props.defaultValue ) {
				store.fetchWikidataEntitiesByType( { type: entityType.value, ids: [ props.defaultValue ] } );
			}
		}

		// Watch
		watch( () => props.shouldUseDefaultValue, () => {
			validate( entityId.value );
		} );

		// Lifecycle
		onMounted( () => {
			fetchDefaultValue();
			validate( entityId.value );
		} );

		return {
			entityId,
			entityLabel,
			entityType,
			placeholder,
			isValidating,
			onSelect,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-input-wikidata {
	position: relative;

	.ext-wikilambda-app-function-input-wikidata__progress-indicator {
		position: absolute;
		right: @spacing-50;
		bottom: @spacing-25;

		.cdx-progress-indicator__indicator {
			width: @size-icon-small;
			height: @size-icon-small;
			min-width: @size-icon-small;
			min-height: @size-icon-small;
		}
	}
}

</style>
