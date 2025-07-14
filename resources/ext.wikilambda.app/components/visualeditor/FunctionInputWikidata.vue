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
			@select-wikidata-entity="onSelect"
		></wl-wikidata-entity-selector>
		<cdx-progress-indicator
			v-if="isValidating"
			class="ext-wikilambda-app-function-input-parser__progress-indicator">
			{{ $i18n( 'wikilambda-loading' ).text() }}
		</cdx-progress-indicator>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState, mapActions } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );

// Wikidata components
const WikidataEntitySelector = require( '../types/wikidata/EntitySelector.vue' );
// Codex components
const { CdxProgressIndicator } = require( '../../../codex.js' );

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
		}
	},
	emits: [ 'input', 'update', 'validate' ],
	data() {
		return {
			isValidating: false
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getWikidataEntityLabelData',
		'getWikidataEntityDataAsync'
	] ), {
		/**
		 * Get the Wikidata entity type based on the input type
		 *
		 * @return {string}
		 */
		entityType: function () {
			return Constants.WIKIDATA_SIMPLIFIED_TYPES[ this.inputType ];
		},
		/**
		 * Get the current entity ID from the value
		 *
		 * @return {string|null}
		 */
		entityId: function () {
			return this.value || null;
		},
		/**
		 * Get the current entity label using getWikidataEntityLabelData
		 *
		 * @return {string}
		 */
		entityLabel: function () {
			const labelData = this.getWikidataEntityLabelData( this.entityType, this.entityId );
			return labelData ? labelData.label : '';
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
		'fetchWikidataEntitiesByType'
	] ), {
		/**
		 * Handle Wikidata entity selection
		 *
		 * @param {string} value - The selected entity ID
		 */
		onSelect: function ( value ) {
			this.$emit( 'input', value );
			this.validateEntity( value, true );
		},
		/**
		 * Updates the validation state of the field.
		 *
		 * @param {boolean} isValid - The validation result.
		 */
		updateValidationState: function ( isValid ) {
			const simplifiedType = Constants.WIKIDATA_SIMPLIFIED_TYPES[ this.entityType ];
			const errorKey = Constants.WIKIDATA_INPUT_ERROR_MSG[ simplifiedType ];
			// eslint-disable-next-line mediawiki/msg-doc
			const errorMessage = !isValid ? this.$i18n( errorKey ).text() : undefined;
			this.$emit( 'validate', { isValid, errorMessage } );
		},
		/**
		 * Validates the value and optionally emits an update event if valid.
		 *
		 * @param {string} value - The value to validate.
		 * @param {boolean} emitUpdate - Whether to emit the update event if valid.
		 */
		validate: function ( value, emitUpdate = false ) {
			// For empty values, check if empty field is allowed
			// TODO (T398733): Enable Default Value for Wikidata item and Wikidata item reference
			if ( !value ) {
				this.updateValidationState( this.allowsEmptyField );
				return;
			}

			// For non-empty values, validate the entity
			this.validateEntity( value, emitUpdate );
		},
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
		 * @param {string} entityId - The Wikidata entity ID to validate (e.g., 'Q42', 'L123', 'P31')
		 * @param {boolean} [emitUpdate=false] - Whether to emit an 'update' event if validation succeeds
		 */
		validateEntity: function ( entityId, emitUpdate = false ) {
			// Set validating state and emit invalid until we get a response
			this.isValidating = true;
			this.$emit( 'validate', { isValid: false } );

			// First, try to get the entity data asynchronously
			this.getWikidataEntityDataAsync( this.entityType, entityId )
				.then( () => {
					// Entity exists and is valid
					this.updateValidationState( true );
					if ( emitUpdate ) {
						this.$emit( 'update', entityId );
					}
				} )
				// Entity doesn't exist or there was an error
				// Try to fetch it first, then validate again
				.catch( () => this.fetchWikidataEntitiesByType( { type: this.entityType, ids: [ entityId ] } )
					// After fetching, try to get the entity data again
					.then( () => this.getWikidataEntityDataAsync( this.entityType, entityId ) )
					.then( () => {
						// Entity exists and is valid after fetch
						this.updateValidationState( true );
						if ( emitUpdate ) {
							this.$emit( 'update', entityId );
						}
					} )
					.catch( () => {
						// Entity doesn't exist or fetch failed
						this.updateValidationState( false );
					} )
				)
				.finally( () => {
					this.isValidating = false;
				} );
		}
	} ),
	mounted: function () {
		this.validate( this.entityId );
	}
} );
</script>
