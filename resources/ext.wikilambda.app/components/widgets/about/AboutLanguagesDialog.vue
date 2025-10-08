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
			:title="i18n( 'wikilambda-about-widget-view-languages-accessible-title' ).text()"
			@update:open="closeDialog"
		>
			<!-- Dialog Header -->
			<template #header>
				<wl-custom-dialog-header @close-dialog="closeDialog">
					<template #title>
						{{ i18n( 'wikilambda-about-widget-view-languages-title' ).text() }}
					</template>
				</wl-custom-dialog-header>
				<!-- Language Search block -->
				<div class="ext-wikilambda-app-about-languages-dialog__search">
					<cdx-search-input
						:model-value="searchTerm"
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
						{{ i18n( 'wikilambda-cancel' ).text() }}
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
							<a v-else>{{ i18n( 'wikilambda-about-widget-add-language' ).text() }}</a>
						</div>
					</div>
				</div>
			</div>
		</cdx-dialog>
	</div>
</template>

<script>
const { computed, defineComponent, inject, ref } = require( 'vue' );
const { CdxButton, CdxDialog, CdxSearchInput } = require( '../../../../codex.js' );
const Constants = require( '../../../Constants.js' );
const CustomDialogHeader = require( '../../base/CustomDialogHeader.vue' );
const LabelData = require( '../../../store/classes/LabelData.js' );
const useMainStore = require( '../../../store/index.js' );

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
	emits: [ 'add-language', 'close-dialog' ],
	setup( _, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		// Reactive data
		const searchTerm = ref( '' );
		const lookupResults = ref( [] );
		const showSearchCancel = ref( false );
		const lookupAbortController = ref( null );

		/**
		 * Returns a list of all the fallback language Zids.
		 *
		 * @return {Array}
		 */
		const suggestedLangs = computed( () => store.getFallbackLanguageZids );

		/**
		 * Returns a list of all the language Zids that are present
		 * in the metadata collection (must have at least a name, a
		 * description or a set of aliases). The list excludes all
		 * the suggested (fallback) language zids.
		 *
		 * @return {Array}
		 */
		const allLangs = computed( () => store.getMultilingualDataLanguages.all
			.filter( ( lang ) => !suggestedLangs.value.includes( lang ) ) );

		/**
		 * Builds the list of items that correspond to the available
		 * languages in the object. Each item contains the language Zid
		 * and label, the Name/Label in that language, and the flags
		 * hasMultilingualData and hasName that will condition the style.
		 *
		 * @return {Array}
		 */
		const localItems = computed( () => {
			const buildLangItem = ( langZid ) => {
				const name = store.getZPersistentName( langZid );
				return {
					langZid,
					langLabelData: store.getLabelData( langZid ),
					hasMultilingualData: true,
					hasName: !!name,
					name: name ? name.value : i18n( 'wikilambda-editor-default-name' ).text()
				};
			};

			const sortByLabel = ( a, b ) => a.langLabelData.label.localeCompare(
				b.langLabelData.label,
				store.getUserLangCode,
				{ sensitivity: 'base' }
			);

			const suggestedLangsList = store.getFallbackLanguageZids.map( ( zid ) => buildLangItem( zid ) );
			const otherLangs = allLangs.value.map( ( zid ) => buildLangItem( zid ) ).sort( sortByLabel );

			const itemsList = [];
			if ( suggestedLangsList.length > 0 ) {
				itemsList.push( {
					label: i18n( 'wikilambda-about-widget-view-languages-suggested' ).text(),
					disabled: true
				}, ...suggestedLangsList );
			}
			if ( otherLangs.length > 0 ) {
				itemsList.push( {
					label: i18n( 'wikilambda-about-widget-view-languages-other' ).text(),
					disabled: true
				}, ...otherLangs );
			}
			return itemsList;
		} );

		/**
		 * Returns the list of items that will be rendered in the component.
		 * This list can include the locally available languages and the ones
		 * returned by a language lookup.
		 *
		 * @return {Array}
		 */
		const items = computed( () => ( lookupResults.value.length > 0 ) ?
			lookupResults.value :
			localItems.value );

		/**
		 * Returns the i18n message for the language search box placeholder
		 *
		 * @return {string}
		 */
		const searchPlaceholder = computed( () => i18n( 'wikilambda-about-widget-search-language-placeholder' ).text() );

		/**
		 * Returns whether the given language Zid has any metadata
		 * in the current object (either name, description or aliases)
		 *
		 * @param {string} langZid
		 * @return {boolean}
		 */
		function hasMultilingualData( langZid ) {
			return ( allLangs.value.includes( langZid ) );
		}

		/**
		 * Emits the add-language event so that we can edit or
		 * create multilingual data in a given language by adding a new
		 * block in the About widget accordion.
		 *
		 * @param {string} lang
		 */
		function editLanguage( lang ) {
			emit( 'add-language', lang );
			closeDialog();
		}

		/**
		 * Close the dialog and make sure that the selected language
		 * and unsaved changes are cleared.
		 */
		function closeDialog() {
			searchTerm.value = '';
			lookupResults.value = [];
			showSearchCancel.value = false;
			emit( 'close-dialog' );
		}

		/**
		 * Clear the search field and results
		 */
		function clearSearch() {
			searchTerm.value = '';
			updateSearchTerm( '' );
			showSearchCancel.value = false;
		}

		/**
		 * Update the lookupResults when there's a new search
		 * term in the language search box.
		 *
		 * @param {string} value
		 */
		function updateSearchTerm( value ) {
			searchTerm.value = value;
			if ( !value ) {
				lookupResults.value = [];
				return;
			}
			getLookupResults( value );
		}

		/**
		 * Triggers a lookup API to search for matches for the
		 * given substring and formats the results to be shown
		 * in the dialog list.
		 *
		 * @param {string} substring
		 */
		function getLookupResults( substring ) {
			const allZids = [];
			// Cancel previous request if any
			if ( lookupAbortController.value ) {
				lookupAbortController.value.abort();
			}
			lookupAbortController.value = new AbortController();
			store.lookupZObjectLabels( {
				input: substring,
				types: [ Constants.Z_NATURAL_LANGUAGE ],
				signal: lookupAbortController.value.signal
			} ).then( ( data ) => {
				const { labels } = data;
				// Compile information for every search result
				lookupResults.value = labels
					.map( ( result ) => {
						const name = store.getZPersistentName( result.page_title );
						allZids.push( result.page_title );
						const labelData = new LabelData(
							result.page_title,
							result.label,
							result.match_lang,
							store.getLanguageIsoCodeOfZLang( result.match_lang )
						);
						return {
							langZid: result.page_title,
							langLabelData: labelData,
							hasMultilingualData: hasMultilingualData( result.page_title ),
							hasName: !!name,
							name: name ? name.value : i18n( 'wikilambda-editor-default-name' ).text()
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
				store.fetchZids( { zids: allZids } );
			} ).catch( ( error ) => {
				if ( error.code === 'abort' ) {
					return;
				}
			} );
		}

		return {
			clearSearch,
			closeDialog,
			editLanguage,
			items,
			searchPlaceholder,
			searchTerm,
			showSearchCancel,
			updateSearchTerm,
			i18n
		};
	}
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
		color: @color-subtle;
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
