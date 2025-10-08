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
			{{ i18n( 'wikilambda-zobjectselector-no-results' ).text() }}
		</template>
	</cdx-lookup>
</template>

<script>
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );

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
		},
		placeholder: {
			type: String,
			required: false,
			default: ''
		}
	},
	emits: [ 'select-wikidata-entity' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		// Reactive data
		const wikidataIcon = wikidataIconSvg;
		const inputValue = ref( '' );
		const lookupResults = ref( [] );
		const lookupConfig = ref( {
			boldLabel: true,
			searchQuery: '',
			visibleItemLimit: 5,
			searchContinue: null
		} );
		const lookupDelayTimer = ref( null );
		const lookupDelayMs = 300;
		const lookupAbortController = ref( null );

		/**
		 * Return the placeholder string depending on the item to select
		 *
		 * @return {string}
		 */
		const lookupPlaceholder = computed( () => {
			if ( props.placeholder ) {
				return props.placeholder;
			}
			const msg = Constants.WIKIDATA_SELECTOR_PLACEHOLDER_MSG[ props.type ];

			return i18n( msg || 'wikilambda-wikidata-entity-selector-placeholder' ).text();
		} );

		/**
		 * Perform Wikidata Entity lookup given a search term.
		 *
		 * @param {string} searchTerm
		 */
		function getLookupResults( searchTerm ) {
			// Cancel previous request if any
			if ( lookupAbortController.value ) {
				lookupAbortController.value.abort();
			}
			lookupAbortController.value = new AbortController();

			const payload = {
				search: searchTerm,
				type: Constants.WIKIDATA_API_TYPE_VALUES[ props.type ],
				searchContinue: lookupConfig.value.searchContinue,
				signal: lookupAbortController.value.signal
			};

			store.lookupWikidataEntities( payload )
				.then( ( data ) => {
					const { searchContinue, search } = data;

					lookupConfig.value.searchContinue = searchContinue;
					lookupConfig.value.searchQuery = searchTerm;
					lookupResults.value = [];

					for ( const entity of search ) {
						lookupResults.value.push( {
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
					lookupConfig.value.searchQuery = searchTerm;
					lookupResults.value = [];
				} );
		}

		/**
		 * On field input, perform a backend lookup and
		 * save the returned objects in lookupResults array.
		 *
		 * @param {string} input
		 */
		function onInput( input ) {
			inputValue.value = input;

			// Reset searchContinue when a new search is initiated
			lookupConfig.value.searchContinue = null;

			// If empty input, do nothing
			if ( !input ) {
				lookupResults.value = [];
				return;
			}

			// Search after 300 ms
			clearTimeout( lookupDelayTimer.value );
			lookupDelayTimer.value = setTimeout( () => {
				getLookupResults( input );
			}, lookupDelayMs );
		}

		/**
		 * When lookup selected value updates, emit a set-value
		 * event so that parent ZObjectKeyValue sets the value
		 * of the Fetch Wikidata Entity function call.
		 * If the field is cleared, set value as empty string.
		 *
		 * @param {string} value
		 */
		function onSelect( value ) {
			// T374246: Disable clear strategy
			if ( value === null ) {
				return;
			}

			// If the already selected value is selected again, exit early
			// and reset the input value to the selected value (T382755).
			if ( props.entityId === value ) {
				inputValue.value = props.entityLabel;
				return;
			}

			emit( 'select-wikidata-entity', value || '' );
		}

		/**
		 * On focus, if there is an inputValue and the lookupResults are empty,
		 * get the lookup results for the inputValue.
		 * This ensures that the lookup results are populated when the field is focused,
		 * especially when the field is mounted.
		 */
		function onFocus() {
			if ( inputValue.value && !lookupResults.value.length ) {
				getLookupResults( inputValue.value );
			}
		}

		/**
		 * On blur, select the value that matches the inputValue if valid;
		 * else, restore the previous selected value.
		 */
		function onBlur() {
			// If current inputValue matches selected lexeme, do nothing:
			if ( inputValue.value === props.entityLabel ) {
				return;
			}

			// Match current inputValue with available menu options:
			const match = lookupResults.value.find( ( option ) => option.label === inputValue.value );
			if ( match ) {
				// Select new value
				onSelect( match.value );
			} else {
				// Reset to old value
				inputValue.value = props.entityLabel;
				lookupConfig.value.searchQuery = props.entityLabel;
			}
		}

		/**
		 * Load more Wikidata Entities when the user scrolls to the bottom of the list
		 * and there are more results to load.
		 */
		function onLoadMore() {
			if ( !lookupConfig.value.searchContinue ) {
				// No more results to load
				return;
			}

			// Use the existing search term stored in lookupConfig.searchQuery
			getLookupResults( lookupConfig.value.searchQuery );
		}

		// Watchers
		watch( () => props.entityLabel, ( label ) => {
			inputValue.value = label;
		} );

		// Lifecycle
		onMounted( () => {
			inputValue.value = props.entityLabel;
		} );

		return {
			inputValue,
			lookupConfig,
			lookupPlaceholder,
			lookupResults,
			onBlur,
			onFocus,
			onInput,
			onLoadMore,
			onSelect,
			wikidataIcon,
			i18n
		};
	}
} );
</script>

<style lang="less">
.ext-wikilambda-app-wikidata-entity-selector {
	.cdx-menu-item__text__description {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
	}
}
</style>
