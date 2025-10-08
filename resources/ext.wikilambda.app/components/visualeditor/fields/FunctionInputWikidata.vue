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
const { computed, defineComponent, inject, onMounted, ref } = require( 'vue' );

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

		const isValidating = ref( false );

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

		/**
		 * Whether this input type allows for empty fields
		 *
		 * @return {boolean}
		 */
		const allowsEmptyField = computed( () => Constants.VE_ALLOW_EMPTY_FIELD.includes( props.inputType ) );

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
				// Get the entity label from the store
				const labelData = store.getWikidataEntityLabelData( entityType.value, defaultValueId );
				return labelData ? labelData.label : defaultValueId;
			}
			return '';
		} );
		/**
		 * Updates the validation state
		 *
		 * @param {boolean} isValid
		 */
		const updateValidationState = ( isValid ) => {
			const simplifiedType = Constants.WIKIDATA_SIMPLIFIED_TYPES[ entityType.value ];
			const errorMessageKey = Constants.WIKIDATA_INPUT_ERROR_MSG[ simplifiedType ];
			const error = !isValid ? ErrorData.buildErrorData( { errorMessageKey } ) : undefined;
			emit( 'validate', { isValid, error } );
		};

		/**
		 * Validates a Wikidata entity ID
		 *
		 * @param {string} entityIdValue
		 * @param {boolean} emitUpdate
		 */
		const validateEntity = ( entityIdValue, emitUpdate = false ) => {
			// Set validating state and emit invalid until we get a response
			isValidating.value = true;
			emit( 'validate', { isValid: false } );

			// Helper function to validate and update the validation state
			const validateAndUpdate = () => {
				updateValidationState( true );
				if ( emitUpdate ) {
					emit( 'update', entityIdValue );
				}
			};

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
		};

		/**
		 * Validates the value
		 *
		 * @param {string} value
		 * @param {boolean} emitUpdate
		 */
		const validate = ( value, emitUpdate = false ) => {
			// If default value checkbox is checked, field is valid
			if ( props.shouldUseDefaultValue ) {
				updateValidationState( true );
				if ( emitUpdate ) {
					emit( 'update', value );
				}
				return;
			}

			// For empty values, check if empty field is allowed
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
		};

		/**
		 * Handle Wikidata entity selection
		 *
		 * @param {string} value
		 */
		const onSelect = ( value ) => {
			emit( 'input', value );
			validateEntity( value, true );
		};

		/**
		 * Fetches the default value from wikidata.
		 */
		const fetchDefaultValue = () => {
			if ( props.defaultValue ) {
				store.fetchWikidataEntitiesByType( { type: entityType.value, ids: [ props.defaultValue ] } );
			}
		};

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
