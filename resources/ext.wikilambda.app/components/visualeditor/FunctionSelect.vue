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
				ref="searchInput"
				:model-value="searchTerm"
				:placeholder="$i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-search-placeholder' )"
				@update:model-value="updateSearchTerm"
				@focus="showSearchCancel = true"
			></cdx-search-input>
		</div>
		<div class="ext-wikilambda-app-function-select__results">
			<!-- Suggested items -->
			<template v-if="showSuggested">
				<div class="ext-wikilambda-app-function-select__title">
					{{ $i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-suggested-functions-title' ) }}
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
						{{ $i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-search-results-title' ) }}
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
						{{ $i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-search-no-results' ) }}
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
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const typeMixin = require( '../../mixins/typeMixin.js' );
const useMainStore = require( '../../store/index.js' );
const FunctionSelectItem = require( './FunctionSelectItem.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-select',
	components: {
		'cdx-search-input': CdxSearchInput,
		'wl-function-select-item': FunctionSelectItem
	},
	mixins: [ typeMixin ],
	data: function () {
		return {
			showSearchCancel: false,
			lookupAbortController: null,
			callsToAction: [
				{
					title: this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-cta-suggest-title' ).parse(),
					description: this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-cta-suggest-description' ).text()
				},
				{
					title: this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-cta-create-title' ).parse(),
					description: this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-cta-create-description' ).text()
				},
				{
					title: this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-cta-explore-title' ).parse(),
					description: this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-cta-explore-description' ).text()
				}
			]
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getDescription',
		'getLabelData',
		'getSuggestedFunctions',
		'getSearchTerm',
		'getLookupResults'
	] ), {
		/**
		 * Returns the information of the suggested function Zids
		 *
		 * @return {Array}
		 */
		suggested: function () {
			return this.getSuggestedFunctions.map( ( zid ) => ( {
				zid,
				labelData: this.getLabelData( zid ),
				description: this.getDescription( zid )
			} ) );
		},
		/**
		 * Returns true when search term is empty and there are suggestions to show
		 *
		 * @return {boolean}
		 */
		showSuggested: function () {
			return ( this.suggested.length > 0 ) && ( this.searchTerm.length === 0 );
		},
		/**
		 * Returns the array of the description objects from the lookup results
		 *
		 * @return {Array}
		 */
		descriptions: function () {
			return this.lookupResults.map( ( item ) => this.getDescription( item.zid ) );
		},
		/**
		 * Returns the current search term
		 *
		 * @return {string}
		 */
		searchTerm: function () {
			return this.getSearchTerm;
		},
		/**
		 * Returns the current lookup results
		 *
		 * @return {Array}
		 */
		lookupResults: function () {
			return this.getLookupResults;
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'lookupFunctions',
		'fetchZids',
		'setSearchTerm',
		'setLookupResults',
		'submitVEInteraction'
	] ), {
		/**
		 * Update the lookupResults when there's a new search
		 * term in the language search box.
		 *
		 * @param {string} value
		 */
		updateSearchTerm: function ( value ) {
			this.setSearchTerm( value );
			if ( !value ) {
				this.setLookupResults( [] );
				return;
			}
			this.fetchLookupResults( value );
			// Track the searching for a function
			this.submitVEInteraction( 'search-change-query' );
		},
		/**
		 * Triggers a lookup API to search for matches for the
		 * given substring and formats the results to be shown
		 * in the dialog list.
		 *
		 * @param {string} substring
		 */
		fetchLookupResults: function ( substring ) {
			const allZids = [];
			// Cancel previous request if any
			if ( this.lookupAbortController ) {
				this.lookupAbortController.abort();
			}
			this.lookupAbortController = new AbortController();
			this.lookupFunctions( {
				search: substring,
				renderable: true,
				signal: this.lookupAbortController.signal
			} ).then( ( data ) => {
				const { objects } = data;
				// If the string searched has changed, do not show the search result
				if ( !this.searchTerm.includes( substring ) ) {
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
				this.setLookupResults( results );
				// Fetch the result zid information (labels)
				this.fetchZids( { zids: allZids } );
			} ).catch( ( error ) => {
				if ( error.code === 'abort' ) {
					return;
				}
			} );
		},
		/**
		 * If the selected value is a valid Zid, emit select event
		 *
		 * @param {string} value
		 */
		selectFunction: function ( value ) {
			if ( value && this.isValidZidFormat( value ) ) {
				this.$emit( 'select', value );
				// Track the selecting a function
				this.submitVEInteraction( 'search-choose-function' );
			}
		},
		/**
		 * Focus the search input
		 */
		focusSearchInput: function () {
			if ( this.$refs.searchInput ) {
				this.$refs.searchInput.focus();
			}
		}
	} )
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
