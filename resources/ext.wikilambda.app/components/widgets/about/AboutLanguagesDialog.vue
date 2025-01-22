<!--
	WikiLambda Vue component for the AboutLanguages Dialog.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div>
		<cdx-dialog
			:open="open"
			data-testid="languages-dialog"
			class="ext-wikilambda-app-about-languages-dialog"
			:title="$i18n( 'wikilambda-about-widget-view-languages-accessible-title' ).text()"
			@update:open="closeDialog"
		>
			<!-- Dialog Header -->
			<template #header>
				<wl-custom-dialog-header @close="closeDialog">
					<template #title>
						{{ $i18n( 'wikilambda-about-widget-view-languages-title' ).text() }}
					</template>
				</wl-custom-dialog-header>
				<!-- Language Search block -->
				<div class="ext-wikilambda-app-about-languages-dialog__search">
					<cdx-search-input
						v-model="searchTerm"
						data-testid="search-language"
						class="ext-wikilambda-app-about-languages-dialog__search-input"
						:placeholder="searchPlaceholder"
						@update:model-value="updateSearchTerm"
						@focus="showSearchCancel = true"
					></cdx-search-input>
					<cdx-button
						v-if="showSearchCancel"
						action="default"
						weight="quiet"
						class="ext-wikilambda-app-about-languages-dialog__search-cancel"
						@click="clearSearch"
					>
						{{ $i18n( 'wikilambda-cancel' ).text() }}
					</cdx-button>
				</div>
			</template>
			<!-- Dialog Body: Language Items block -->
			<div class="ext-wikilambda-app-about-languages-dialog__items">
				<div
					v-for="( item, index ) in items"
					:key="'dialog-lang-' + index"
				>
					<div
						v-if="item.disabled"
						class="ext-wikilambda-app-about-languages-dialog__title"
					>
						{{ item.label }}
					</div>
					<div
						v-else
						class="ext-wikilambda-app-about-languages-dialog__item"
						@click="editLanguage( item.langZid )"
					>
						<div
							class="ext-wikilambda-app-about-languages-dialog__item-title"
							:lang="item.langLabelData.langCode"
							:dir="item.langLabelData.langDir"
						>
							{{ item.langLabelData.label }}
						</div>
						<div class="ext-wikilambda-app-about-languages-dialog__item-field">
							<span
								v-if="item.hasMultilingualData"
								:class="{ 'ext-wikilambda-app-about-languages-dialog__item-untitled': !item.hasName }"
							>{{ item.name }}</span>
							<a v-else>{{ $i18n( 'wikilambda-about-widget-add-language' ).text() }}</a>
						</div>
					</div>
				</div>
			</div>
		</cdx-dialog>
	</div>
</template>

<script>
const { CdxButton, CdxDialog, CdxSearchInput } = require( '@wikimedia/codex' );
const { defineComponent } = require( 'vue' );
const Constants = require( '../../../Constants.js' ),
	LabelData = require( '../../../store/classes/LabelData.js' ),
	CustomDialogHeader = require( '../../base/CustomDialogHeader.vue' ),
	{ mapActions, mapGetters } = require( 'vuex' );

module.exports = exports = defineComponent( {
	name: 'wl-about-languages-dialog',
	components: {
		'cdx-button': CdxButton,
		'cdx-dialog': CdxDialog,
		'cdx-search-input': CdxSearchInput,
		'wl-custom-dialog-header': CustomDialogHeader
	},
	props: {
		open: {
			type: Boolean,
			required: true,
			default: false
		}
	},
	data: function () {
		return {
			searchTerm: '',
			lookupResults: [],
			showSearchCancel: false
		};
	},
	computed: Object.assign( mapGetters( [
		'getFallbackLanguageZids',
		'getLabelData',
		'getLanguageIsoCodeOfZLang',
		'getMultilingualDataLanguages',
		'getZMonolingualTextValue',
		'getZPersistentName'
	] ), {
		/**
		 * Returns a list of all the fallback language Zids.
		 *
		 * @return {Array}
		 */
		suggestedLangs: function () {
			return this.getFallbackLanguageZids;
		},

		/**
		 * Returns a list of all the language Zids that are present
		 * in the metadata collection (must have at least a name, a
		 * description or a set of aliases). The list excludes all
		 * the suggested (fallback) language zids.
		 *
		 * @return {Array}
		 */
		allLangs: function () {
			return this.getMultilingualDataLanguages()
				.filter( ( lang ) => !this.suggestedLangs.includes( lang ) );
		},

		/**
		 * Builds the list of items that correspond to the available
		 * languages in the object. Each item contains the language Zid
		 * and label, the Name/Label in that language, and the flags
		 * hasMultilingualData and hasName that will condition the style.
		 *
		 * @return {Array}
		 */
		localItems: function () {
			const buildLangItem = ( langZid ) => {
				const nameRow = this.getZPersistentName( langZid );
				const name = nameRow ?
					this.getZMonolingualTextValue( nameRow.id ) :
					undefined;
				return {
					langZid,
					langLabelData: this.getLabelData( langZid ),
					hasMultilingualData: true,
					hasName: !!name,
					name: name || this.$i18n( 'wikilambda-editor-default-name' ).text()
				};
			};

			const sortByLabel = ( a, b ) => {
				if ( a.langLabelData.label < b.langLabelData.label ) {
					return -1;
				}
				if ( a.langLabelData.label > b.langLabelData.label ) {
					return 1;
				}
				return 0;
			};

			const suggestedLangs = this.getFallbackLanguageZids.map( ( zid ) => buildLangItem( zid ) );
			const otherLangs = this.allLangs.map( ( zid ) => buildLangItem( zid ) ).sort( sortByLabel );

			const items = [];
			if ( suggestedLangs.length > 0 ) {
				items.push( {
					label: this.$i18n( 'wikilambda-about-widget-view-languages-suggested' ).text(),
					disabled: true
				}, ...suggestedLangs );
			}
			if ( otherLangs.length > 0 ) {
				items.push( {
					label: this.$i18n( 'wikilambda-about-widget-view-languages-other' ).text(),
					disabled: true
				}, ...otherLangs );
			}
			return items;
		},

		/**
		 * Returns the list of items that will be rendered in the component.
		 * This list can include the locally available languages and the ones
		 * returned by a language lookup.
		 *
		 * @return {Array}
		 */
		items: function () {
			return ( this.lookupResults.length > 0 ) ?
				this.lookupResults :
				this.localItems;
		},

		/**
		 * Returns the i18n message for the language search box placeholder
		 *
		 * @return {string}
		 */
		searchPlaceholder: function () {
			return this.$i18n( 'wikilambda-about-widget-search-language-placeholder' ).text();
		}
	} ),
	methods: Object.assign( mapActions( [
		'fetchZids',
		'lookupZObjectLabels'
	] ), {
		/**
		 * Returns whether the given language Zid has any metadata
		 * in the current object (either name, description or aliases)
		 *
		 * @param {string} langZid
		 * @return {boolean}
		 */
		hasMultilingualData: function ( langZid ) {
			return ( this.allLangs.includes( langZid ) );
		},

		/**
		 * Emits the add-language event so that we can edit or
		 * create multilingual data in a given language by adding a new
		 * block in the About widget accordion.
		 *
		 * @param {string} lang
		 */
		editLanguage: function ( lang ) {
			this.$emit( 'add-language', lang );
			this.closeDialog();
		},

		/**
		 * Close the dialog and make sure that the selected language
		 * and unsaved changes are cleared.
		 */
		closeDialog: function () {
			this.searchTerm = '';
			this.lookupResults = [];
			this.$emit( 'close-dialog' );
		},

		/**
		 * Clear the search field and results
		 */
		clearSearch: function () {
			this.searchTerm = '';
			this.updateSearchTerm( '' );
			this.showSearchCancel = false;
		},

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
			this.lookupZObjectLabels( {
				input: substring,
				type: Constants.Z_NATURAL_LANGUAGE
			} ).then( ( payload ) => {
				// If the string searched has changed, do not show the search result
				if ( !this.searchTerm.includes( substring ) ) {
					return;
				}
				// Compile information for every search result
				this.lookupResults = payload
					.map( ( result ) => {
						const nameRow = this.getZPersistentName( result.page_title );
						const name = nameRow ?
							this.getZMonolingualTextValue( nameRow.id ) :
							undefined;
						allZids.push( result.page_title );
						const labelData = new LabelData(
							result.page_title,
							result.label,
							result.match_lang,
							this.getLanguageIsoCodeOfZLang( result.match_lang )
						);
						return {
							langZid: result.page_title,
							langLabelData: labelData,
							hasMultilingualData: this.hasMultilingualData( result.page_title ),
							hasName: !!name,
							name: name || this.$i18n( 'wikilambda-editor-default-name' ).text()
						};
					} )
					.sort( ( a, b ) => {
						// Sorts the results so that the items with an available name
						// come first, then the items with any available metadata,
						// and finally the items that don't have any metadata yet.
						if ( a.hasName ) {
							return -2;
						}
						if ( b.hasName ) {
							return 2;
						}
						if ( a.hasMultilingualData ) {
							return -1;
						}
						if ( b.hasMultilingualData ) {
							return 1;
						}
						return 0;
					} );
				// Fetch the result zid information (labels)
				this.fetchZids( { zids: allZids } );
			} );
		}
	} )
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-about-languages-dialog {
	.cdx-dialog__body {
		padding: @spacing-50 0;
	}

	.ext-wikilambda-app-about-languages-dialog__search {
		padding: @spacing-100 0 0;
		display: flex;
		gap: @spacing-150;
	}

	.ext-wikilambda-app-about-languages-dialog__search-input {
		flex-grow: 1;
	}

	.ext-wikilambda-app-about-languages-dialog__search-cancel {
		flex-grow: 0;
	}

	.ext-wikilambda-app-about-languages-dialog__title {
		padding: @spacing-50 @spacing-150;
		font-weight: @font-weight-bold;
		color: @color-disabled;
	}

	.ext-wikilambda-app-about-languages-dialog__item {
		padding: @spacing-50 @spacing-150;

		&:hover {
			cursor: pointer;
			background-color: @background-color-interactive;
		}
	}

	.ext-wikilambda-app-about-languages-dialog__item-title {
		margin: 0;
	}

	.ext-wikilambda-app-about-languages-dialog__item-field {
		margin: 0;
		color: @color-subtle;
	}

	.ext-wikilambda-app-about-languages-dialog__item-untitled {
		color: @color-placeholder;
		font-style: italic;
	}
}
</style>
