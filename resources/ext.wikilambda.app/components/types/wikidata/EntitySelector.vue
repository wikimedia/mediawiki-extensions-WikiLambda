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
		:start-icon="wikidataIcon"
		@update:selected="onSelect"
		@update:input-value="onInput"
		@blur="onBlur"
		@focus="onFocus"
		@load-more="onLoadMore"
	>
		<template #no-results>
			{{ $i18n( 'wikilambda-zobjectselector-no-results' ).text() }}
		</template>
	</cdx-lookup>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const wikidataIconSvg = require( './wikidataIconSvg.js' );

// Codex components
const { CdxLookup } = require( '../../../../codex.js' );

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
		}
	},
	data: function () {
		return {
			wikidataIcon: wikidataIconSvg,
			inputValue: '',
			lookupResults: [],
			lookupConfig: {
				boldLabel: true,
				searchQuery: '',
				visibleItemLimit: 5,
				searchContinue: null
			},
			lookupDelayTimer: null,
			lookupDelayMs: 300,
			lookupAbortController: null
		};
	},
	computed: {
		/**
		 * Return the placeholder string depending on the item to select
		 *
		 * @return {string}
		 */
		lookupPlaceholder: function () {
			const msg = Constants.WIKIDATA_SELECTOR_PLACEHOLDER_MSG[ this.type ];
			// eslint-disable-next-line mediawiki/msg-doc
			return this.$i18n( msg || 'wikilambda-wikidata-entity-selector-placeholder' ).text();
		}
	},
	methods: Object.assign( {}, mapActions( useMainStore, [
		'lookupWikidataEntities'
	] ), {
		/**
		 * On field input, perform a backend lookup and
		 * save the returned objects in lookupResults array.
		 *
		 * @param {string} input
		 */
		onInput: function ( input ) {
			this.inputValue = input;

			// Reset searchContinue when a new search is initiated
			this.lookupConfig.searchContinue = null;

			// If empty input, reset lookupResults
			if ( !input ) {
				this.lookupResults = [];
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
		 * of the Fetch Wikidata Entity function call.
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
		 * On focus, if there is an inputValue and the lookupResults are empty,
		 * get the lookup results for the inputValue.
		 * This ensures that the lookup results are populated when the field is focused,
		 * especially when the field is mounted.
		 */
		onFocus: function () {
			if ( this.inputValue && !this.lookupResults.length ) {
				this.getLookupResults( this.inputValue );
			}
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
		 * Load more Wikidata Entities when the user scrolls to the bottom of the list
		 * and there are more results to load.
		 */
		onLoadMore: function () {
			if ( !this.lookupConfig.searchContinue ) {
				// No more results to load
				return;
			}

			// Use the existing search term stored in lookupConfig.searchQuery
			this.getLookupResults( this.lookupConfig.searchQuery );
		},
		/**
		 * Perform Wikidata Entity lookup given a search term.
		 *
		 * @param {string} input
		 */
		getLookupResults: function ( input ) {
			// Cancel previous request if any
			if ( this.lookupAbortController ) {
				this.lookupAbortController.abort();
			}
			this.lookupAbortController = new AbortController();

			const payload = {
				search: input,
				type: Constants.WIKIDATA_API_TYPE_VALUES[ this.type ],
				searchContinue: this.lookupConfig.searchContinue,
				signal: this.lookupAbortController.signal
			};

			this.lookupWikidataEntities( payload )
				.then( ( data ) => {
					const { searchContinue, search } = data;
					this.lookupConfig.searchContinue = searchContinue;
					this.lookupConfig.searchQuery = input;
					this.lookupResults = [];
					for ( const entity of search ) {
						this.lookupResults.push( {
							value: entity.id,
							label: entity.label,
							description: entity.description,
							title: entity.description
						} );
					}
				} )
				.catch( ( error ) => {
					if ( error.code === 'abort' ) {
						return;
					}
					this.lookupConfig.searchQuery = input;
					this.lookupResults = [];
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

<style lang="less">
.ext-wikilambda-app-wikidata-entity-selector {
	.cdx-menu-item__text__description {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}
}
</style>
