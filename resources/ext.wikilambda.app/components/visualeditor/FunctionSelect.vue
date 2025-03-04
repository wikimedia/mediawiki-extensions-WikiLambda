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
				v-model="searchTerm"
				:placeholder="$i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-search-placeholder' )"
				@update:model-value="updateSearchTerm"
				@focus="showSearchCancel = true"
			></cdx-search-input>
		</div>
		<div class="ext-wikilambda-app-function-select__results">
			<template v-if="showSuggested">
				<div class="ext-wikilambda-app-function-select__title">
					{{ $i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-suggested-functions-title' ) }}
				</div>
				<div
					v-for="item in suggested"
					:key="item.zid"
					class="ext-wikilambda-app-function-select__item"
					@click="selectFunction( item.zid )"
				>
					<p
						class="ext-wikilambda-app-function-select__item-title"
						:lang="item.labelData.langCode"
						:dir="item.labelData.langDir"
					>
						{{ item.labelData.label }}
					</p>
					<p class="ext-wikilambda-app-function-select__item-description">
						<!-- TODO (T387361): add langCode and langDir -->
						{{ item.description }}
					</p>
				</div>
			</template>
			<!-- Lookup results -->
			<template v-else>
				<template v-if="lookupResults.length > 0">
					<div class="ext-wikilambda-app-function-select__title">
						{{ $i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-search-results-title' ) }}
					</div>
					<div
						v-for="( item, index ) in lookupResults"
						:key="item.zid"
						class="ext-wikilambda-app-function-select__item"
						@click="selectFunction( item.zid )"
					>
						<p class="ext-wikilambda-app-function-select__item-title">
							{{ item.label }}
						</p>
						<p class="ext-wikilambda-app-function-select__item-description">
							<!-- TODO (T387361): add langCode and langDir -->
							<!-- TODO (T387362): trim description -->
							{{ descriptions[ index ] }}
						</p>
					</div>
				</template>
				<div v-else class="ext-wikilambda-app-function-select__no-results">
					{{ $i18n( 'wikilambda-visualeditor-wikifunctionscall-dialog-search-no-results' ) }}
				</div>
			</template>
		</div>
	</div>
</template>

<script>
const { CdxSearchInput } = require( '../../../codex.js' );
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const typeUtils = require( '../../mixins/typeUtils.js' );
const useMainStore = require( '../../store/index.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-select',
	components: {
		'cdx-search-input': CdxSearchInput
	},
	mixins: [ typeUtils ],
	data: function () {
		return {
			searchTerm: '',
			lookupResults: []
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getDescription',
		'getLabelData',
		'getSuggestedFunctions'
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
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'lookupFunctions',
		'fetchZids'
	] ), {
		/**
		 * Update the lookupResults when there's a new search
		 * term in the language search box.
		 *
		 * @param {string} value
		 */
		updateSearchTerm: function ( value ) {
			if ( !value ) {
				this.lookupResults = [];
				return;
			}
			this.getLookupResults( value );
		},
		/**
		 * Triggers a lookup API to search for matches for the
		 * given substring and formats the results to be shown
		 * in the dialog list.
		 *
		 * @param {string} substring
		 */
		getLookupResults: function ( substring ) {
			const allZids = [];
			this.lookupFunctions( {
				search: substring,
				renderable: true
			} ).then( ( data ) => {
				const { objects } = data;
				// If the string searched has changed, do not show the search result
				if ( !this.searchTerm.includes( substring ) ) {
					return;
				}
				// Compile information for every search result
				this.lookupResults = objects
					.map( ( result ) => {
						allZids.push( result.page_title );
						return {
							zid: result.page_title,
							label: result.label,
							language: result.language
						};
					} );
				// Fetch the result zid information (labels)
				this.fetchZids( { zids: allZids } );
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
		color: @color-subtle;
		font-weight: @font-weight-bold;
	}

	.ext-wikilambda-app-function-select__no-results {
		padding: @spacing-50 @spacing-100;
		color: @color-subtle;
		font-weight: @font-weight-normal;
	}

	.ext-wikilambda-app-function-select__item {
		padding: @spacing-50 @spacing-100;

		&:hover {
			cursor: pointer;
			background-color: @background-color-interactive;
		}
	}

	.ext-wikilambda-app-function-select__item-title {
		margin: 0;
		color: @color-base;
		font-weight: @font-weight-normal;
	}

	.ext-wikilambda-app-function-select__item-description {
		margin: 0;
		color: @color-subtle;
		font-weight: @font-weight-normal;
	}
}
</style>
