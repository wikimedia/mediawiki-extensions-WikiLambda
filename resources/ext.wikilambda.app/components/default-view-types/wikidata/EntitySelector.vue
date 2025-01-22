<!--
	WikiLambda Vue component to search and select Wikidata Entities

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-lookup
		:input-value="inputValue"
		class="ext-wikilambda-app-wikidata-entity-selector"
		data-testid="wikidata-entity-selector"
		:selected="entityId"
		:placeholder="lookupPlaceholder"
		:menu-items="lookupResults"
		:menu-config="lookupConfig"
		:start-icon="icon"
		@update:selected="onSelect"
		@update:input-value="onInput"
		@blur="onBlur"
	>
		<template #no-results>
			{{ $i18n( 'wikilambda-zobjectselector-no-results' ).text() }}
		</template>
	</cdx-lookup>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { Icon, CdxLookup } = require( '@wikimedia/codex' );
const Constants = require( '../../../Constants.js' ),
	{ mapActions } = require( 'vuex' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-entity-selector',
	components: {
		'cdx-lookup': CdxLookup
	},
	props: {
		entityId: {
			type: [ String, null ],
			required: true
		},
		entityLabel: {
			type: String,
			required: true
		},
		type: {
			type: String,
			required: true
		},
		icon: {
			type: Icon,
			required: false,
			default: undefined
		}
	},
	data: function () {
		return {
			inputValue: '',
			lookupResults: [],
			lookupConfig: {
				boldLabel: true,
				searchQuery: '',
				visibleItemLimit: 5
			},
			lookupDelayTimer: null,
			lookupDelayMs: 300
		};
	},
	computed: {
		/**
		 * Return the placeholder string depending on the item to select
		 *
		 * @return {string}
		 */
		lookupPlaceholder: function () {
			switch ( this.type ) {
				case Constants.Z_WIKIDATA_ITEM:
					return this.$i18n( 'wikilambda-wikidata-item-selector-placeholder' ).text();
				case Constants.Z_WIKIDATA_LEXEME:
					return this.$i18n( 'wikilambda-wikidata-lexeme-selector-placeholder' ).text();
				case Constants.Z_WIKIDATA_LEXEME_FORM:
					return this.$i18n( 'wikilambda-wikidata-lexeme-form-selector-placeholder' ).text();
				case Constants.Z_WIKIDATA_LEXEME_SENSE:
				case Constants.Z_WIKIDATA_PROPERTY:
				case Constants.Z_WIKIDATA_STATEMENT:
				default:
					return this.$i18n( 'wikilambda-wikidata-entity-selector-placeholder' ).text();
			}
		}
	},
	methods: Object.assign( mapActions( [
		'lookupWikidataEntities'
	] ), {
		/**
		 * Clears the ZObjectSelector lookup results.
		 * This doesn't clear the component TextInput.
		 */
		clearResults: function () {
			this.lookupResults = [];
		},
		/**
		 * On field input, perform a backend lookup and
		 * save the returned objects in lookupResults array.
		 *
		 * @param {string} input
		 */
		onInput: function ( input ) {
			this.inputValue = input;

			// If empty input, clear and exit
			if ( !input ) {
				this.clearResults();
				return;
			}

			// Search after 300 ms
			clearTimeout( this.lookupDelayTimer );
			this.lookupDelayTimer = setTimeout( () => {
				this.getLookupResults( input );
			}, this.lookupDelayMs );
		},
		/**
		 * When lookup selected value updates, emit a set-value
		 * event so that parent ZObjectKeyValue sets the value
		 * of the Fetch Wikidata Lexeme function call.
		 * If the field is cleared, set value as empty string.
		 *
		 * @param {string} value
		 */
		onSelect: function ( value ) {
			// T374246: Disable clear strategy
			if ( value === null ) {
				return;
			}

			// If the already selected value is selected again, exit early
			// and reset the input value to the selected value (T382755).
			if ( this.entityId === value ) {
				this.inputValue = this.entityLabel;
				return;
			}

			this.$emit( 'select-wikidata-entity', value || '' );
		},
		/**
		 * On blur, select the value that matches the inputValue if valid;
		 * else, restore the previous selected value.
		 */
		onBlur: function () {
			// If current inputValue matches selected lexeme, do nothing:
			if ( this.inputValue === this.entityLabel ) {
				return;
			}

			// Match current inputValue with available menu options:
			const match = this.lookupResults.find( ( option ) => option.label === this.inputValue );
			if ( match ) {
				// Select new value
				this.onSelect( match.value );
			} else {
				// Reset to old value
				this.inputValue = this.entityLabel;
				this.lookupConfig.searchQuery = this.entityLabel;
			}
		},
		/**
		 * Perform Wikidata Lexeme lookup given a search term.
		 *
		 * @param {string} searchTerm
		 */
		getLookupResults: function ( searchTerm ) {
			const payload = {
				search: searchTerm,
				type: Constants.WIKIDATA_API_TYPE_VALUES[ this.type ]
			};

			this.lookupWikidataEntities( payload ).then( ( data ) => {
				const { search } = data;
				const ids = [];
				this.lookupConfig.searchQuery = searchTerm;
				this.lookupResults = [];
				for ( const entity of search ) {
					ids.push( entity.id );
					this.lookupResults.push( {
						value: entity.id,
						label: entity.label,
						description: entity.description
					} );
				}
			} );
		}
	} ),
	watch: {
		entityLabel: function ( label ) {
			this.inputValue = label;
		}
	},
	mounted: function () {
		this.inputValue = this.entityLabel;
	}
} );
</script>
