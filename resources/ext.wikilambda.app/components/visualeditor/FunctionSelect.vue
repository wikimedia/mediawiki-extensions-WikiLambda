<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-select">
		<!-- Main function selector -->
		<div class="ext-wikilambda-app-function-select__field">
			<cdx-search-input
				:model-value="searchTerm"
				:placeholder="searchPlaceholder"
				@update:model-value="updateSearchTerm"
				@focus="showSearchCancel = true"
			></cdx-search-input>
		</div>
		<div class="ext-wikilambda-app-function-select__results">
			<!-- Suggested items -->
			<template v-if="showSuggested">
				<div class="ext-wikilambda-app-function-select__title">
					{{ i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-suggested-functions-title' ) }}
				</div>
				<wl-function-select-item
					v-for="item in suggested"
					:key="item.zid"
					:label-data="item.labelData"
					:description="item.description"
					@click="selectFunction( item.zid )"
				></wl-function-select-item>
			</template>
			<!-- Lookup results -->
			<template v-else>
				<template v-if="lookupResults.length > 0">
					<div class="ext-wikilambda-app-function-select__title">
						{{ i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-search-results-title' ) }}
					</div>
					<wl-function-select-item
						v-for="( item, index ) in lookupResults"
						:key="item.zid"
						:label="item.label"
						:description="descriptions[index]"
						@click="selectFunction( item.zid )"
					></wl-function-select-item>
				</template>
				<div v-else class="ext-wikilambda-app-function-select__no-results">
					<div class="ext-wikilambda-app-function-select__no-results-msg">
						{{ i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-search-no-results' ) }}
					</div>
					<div
						v-for="( cta, index ) in callsToAction"
						:key="`cta-${ index }`"
						class="ext-wikilambda-app-function-select__no-results-cta"
					>
						<!-- eslint-disable-next-line vue/no-v-html -->
						<span v-html="cta.title"></span><br>
						<span>{{ cta.description }}</span>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<script>
const { CdxSearchInput } = require( '../../../codex.js' );
const { computed, defineComponent, inject, ref } = require( 'vue' );

const useType = require( '../../composables/useType.js' );
const useMainStore = require( '../../store/index.js' );
const FunctionSelectItem = require( './FunctionSelectItem.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-select',
	components: {
		'cdx-search-input': CdxSearchInput,
		'wl-function-select-item': FunctionSelectItem
	},
	emits: [ 'select' ],
	setup( _, { emit } ) {
		const i18n = inject( 'i18n' );
		const { isValidZidFormat } = useType();
		const store = useMainStore();

		const showSearchCancel = ref( false );
		let lookupAbortController = null;
		const callsToAction = [
			{
				title: i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-cta-suggest-title' ).parse(),
				description: i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-cta-suggest-description' ).text()
			},
			{
				title: i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-cta-create-title' ).parse(),
				description: i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-cta-create-description' ).text()
			},
			{
				title: i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-cta-explore-title' ).parse(),
				description: i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-cta-explore-description' ).text()
			}
		];

		// Computed properties
		/**
		 * Returns the information of the suggested function Zids
		 *
		 * @return {Array}
		 */
		const suggested = computed( () => store.getSuggestedFunctions.map( ( zid ) => ( {
			zid,
			labelData: store.getLabelData( zid ),
			description: store.getDescription( zid )
		} ) ) );

		/**
		 * Returns the current search term
		 *
		 * @return {string}
		 */
		const searchTerm = computed( () => store.getSearchTerm );

		/**
		 * Returns true when search term is empty and there are suggestions to show
		 *
		 * @return {boolean}
		 */
		const showSuggested = computed( () => ( suggested.value.length > 0 ) && ( searchTerm.value.length === 0 ) );

		/**
		 * Returns the current lookup results
		 *
		 * @return {Array}
		 */
		const lookupResults = computed( () => store.getLookupResults );

		/**
		 * Returns the array of the description objects from the lookup results
		 *
		 * @return {Array}
		 */
		const descriptions = computed( () => lookupResults.value
			.map( ( item ) => store.getDescription( item.zid ) )
		);

		// Methods
		/**
		 * Triggers a lookup API to search for matches for the
		 * given substring and formats the results to be shown
		 * in the dialog list.
		 *
		 * @param {string} substring
		 */
		function fetchLookupResults( substring ) {
			const allZids = [];
			// Cancel previous request if any
			if ( lookupAbortController ) {
				lookupAbortController.abort();
			}
			lookupAbortController = new AbortController();
			store.lookupFunctions( {
				search: substring,
				renderable: true,
				signal: lookupAbortController.signal
			} ).then( ( data ) => {
				const { objects } = data;
				// If the string searched has changed, do not show the search result
				if ( !searchTerm.value.includes( substring ) ) {
					return;
				}
				// Compile information for every search result
				const results = objects
					.map( ( result ) => {
						allZids.push( result.page_title );
						return {
							zid: result.page_title,
							label: result.label,
							language: result.language
						};
					} );
				store.setLookupResults( results );
				// Fetch the result zid information (labels)
				store.fetchZids( { zids: allZids } );
			} ).catch( ( error ) => {
				if ( error.code === 'abort' ) {
					return;
				}
			} );
		}

		/**
		 * Update the lookupResults when there's a new search
		 * term in the language search box.
		 *
		 * @param {string} value
		 */
		function updateSearchTerm( value ) {
			store.setSearchTerm( value );
			if ( !value ) {
				store.setLookupResults( [] );
				return;
			}
			fetchLookupResults( value );
			// Track the searching for a function
			store.submitVEInteraction( 'search-change-query' );
		}

		/**
		 * If the selected value is a valid Zid, emit select event
		 *
		 * @param {string} value
		 */
		function selectFunction( value ) {
			if ( value && isValidZidFormat( value ) ) {
				emit( 'select', value );
				// Track the selecting a function
				store.submitVEInteraction( 'search-choose-function' );
			}
		}

		const searchPlaceholder = computed( () => i18n(
			'wikilambda-visualeditor-wikifunctionscall-dialog-search-placeholder',
			// Note: This is currently a hard-coded value of 2000 Functions.
			mw.language.convertNumber( 2000 )
		).text() );

		return {
			callsToAction,
			descriptions,
			lookupResults,
			searchPlaceholder,
			searchTerm,
			selectFunction,
			showSearchCancel,
			showSuggested,
			suggested,
			updateSearchTerm,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-select {
	.ext-wikilambda-app-function-select__field {
		padding: 16px 16px 8px;
	}

	.ext-wikilambda-app-function-select__results {
		overflow: scroll;
	}

	.ext-wikilambda-app-function-select__title {
		padding: @spacing-50 @spacing-100;
		color: @color-base;
		font-weight: @font-weight-bold;
	}

	.ext-wikilambda-app-function-select__no-results-msg {
		padding: @spacing-50 @spacing-100;
		color: @color-subtle;
		font-weight: @font-weight-bold;
	}

	.ext-wikilambda-app-function-select__no-results-cta {
		padding: @spacing-50 @spacing-100;
	}
}
</style>
