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
			:use-close-button="true"
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
						:placeholder="i18n( 'wikilambda-about-widget-search-language-placeholder' ).text()"
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
				<section
					v-for="group in itemGroups"
					:key="group.id"
					class="ext-wikilambda-app-about-languages-dialog__group"
				>
					<h3
						v-if="group.title"
						class="ext-wikilambda-app-about-languages-dialog__group-title"
					>
						{{ group.title }}
					</h3>
					<ul class="ext-wikilambda-app-list-reset ext-wikilambda-app-about-languages-dialog__list">
						<li
							v-for="( item, index ) in group.items"
							:key="`dialog-lang-${group.id}-${index}`"
							class="ext-wikilambda-app-about-languages-dialog__item"
						>
							<button
								type="button"
								class="ext-wikilambda-app-button-reset
									ext-wikilambda-app-about-languages-dialog__item-button"
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
										:class="{
											'ext-wikilambda-app-about-languages-dialog__item-untitled': !item.hasName
										}"
									>{{ item.name }}</span>
									<span v-else class="ext-wikilambda-app-about-languages-dialog__item-add-language">
										{{ i18n( 'wikilambda-about-widget-add-language' ).text() }}
									</span>
								</div>
							</button>
						</li>
					</ul>
				</section>
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
const { createLabelComparator } = require( '../../../utils/sortUtils.js' );

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

		// Search functionality
		const searchTerm = ref( '' );
		const showSearchCancel = ref( false );

		// Lookup results
		const lookupResults = ref( [] );
		let lookupAbortController = null;

		// Dialog state
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

		// Language data
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
		 * Returns grouped language items for local languages.
		 * Groups are: "Suggested" and "Other".
		 * Returns whether the given language Zid has any metadata
		 * in the current object (either name, description or aliases)
		 *
		 * @param {string} langZid
		 * @return {boolean}
		 */
		const hasMultilingualData = ( langZid ) => allLangs.value.includes( langZid );

		/**
		 * Builds a language item object for a given language Zid.
		 *
		 * @param {string} langZid
		 * @return {Object}
		 */
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

		/**
		 * Builds the list of items that correspond to the available
		 * languages in the object. Each item contains the language Zid
		 * and label, the Name/Label in that language, and the flags
		 * hasMultilingualData and hasName that will condition the style.
		 *
		 * @return {Array}
		 */
		const localItems = computed( () => {
			const sortByLabel = createLabelComparator(
				store.getUserLangCode,
				( item ) => item.langLabelData.label
			);

			const suggestedLangsList = store.getFallbackLanguageZids.map( ( zid ) => buildLangItem( zid ) );
			const otherLangs = allLangs.value.map( ( zid ) => buildLangItem( zid ) ).sort( sortByLabel );

			const groups = [];
			if ( suggestedLangsList.length > 0 ) {
				groups.push( {
					id: 'suggested',
					title: i18n( 'wikilambda-about-widget-view-languages-suggested' ).text(),
					items: suggestedLangsList
				} );
			}
			if ( otherLangs.length > 0 ) {
				groups.push( {
					id: 'other',
					title: i18n( 'wikilambda-about-widget-view-languages-other' ).text(),
					items: otherLangs
				} );
			}
			return groups;
		} );

		// Search functionality

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

		// Lookup results
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
			if ( lookupAbortController ) {
				lookupAbortController.abort();
			}
			lookupAbortController = new AbortController();
			store.lookupZObjectLabels( {
				input: substring,
				types: [ Constants.Z_NATURAL_LANGUAGE ],
				signal: lookupAbortController.signal
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

		// Display items
		/**
		 * Returns grouped language items for both local languages and search results.
		 * For local languages, groups are: "Suggested" and "Other".
		 * For search results, returns a single group without a title.
		 *
		 * @return {Array}
		 */
		const itemGroups = computed( () => {
			// If we have search results, return them as a single group without a title
			if ( lookupResults.value.length > 0 ) {
				return [ {
					id: 'search-results',
					title: '',
					items: lookupResults.value
				} ];
			}

			// Otherwise, return grouped local languages
			return localItems.value;
		} );

		return {
			clearSearch,
			closeDialog,
			editLanguage,
			itemGroups,
			i18n,
			searchTerm,
			showSearchCancel,
			updateSearchTerm
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

	.ext-wikilambda-app-about-languages-dialog__group-title {
		padding: @spacing-50 @spacing-150;
		margin: 0;
		font-weight: @font-weight-bold;
		color: @color-subtle;
		font-size: inherit;
	}

	.ext-wikilambda-app-about-languages-dialog__item {
		margin: 0;
		padding: 0;
	}

	.ext-wikilambda-app-about-languages-dialog__item-button {
		width: 100%;
		padding: @spacing-50 @spacing-150;
		text-align: left;

		&:hover {
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

	.ext-wikilambda-app-about-languages-dialog__item-add-language {
		.cdx-mixin-link();
	}
}
</style>
