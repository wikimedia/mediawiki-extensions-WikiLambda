<!--
	WikiLambda Vue component for the ZMultilingualString Dialog.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div>
		<cdx-dialog
			:open="open"
			data-testid="z-multilingual-string-dialog"
			class="ext-wikilambda-app-z-multilingual-string-dialog"
			:title="i18n( 'wikilambda-monolingual-string-list-dialog-accessible-title' ).text()"
			:use-close-button="true"
			@update:open="closeDialog"
		>
			<!-- Dialog Header -->
			<template #header>
				<wl-custom-dialog-header @close-dialog="closeDialog">
					<template #title>
						{{ i18n( 'wikilambda-monolingual-string-list-dialog-title' ).text() }}
					</template>
				</wl-custom-dialog-header>
				<!-- Language Search block -->
				<div class="ext-wikilambda-app-z-multilingual-string-dialog__search">
					<cdx-search-input
						:model-value="searchTerm"
						data-testid="search-language"
						class="ext-wikilambda-app-z-multilingual-string-dialog__search-input"
						:placeholder="i18n( 'wikilambda-monolingual-string-list-dialog-search-placeholder' ).text()"
						@update:model-value="updateSearchTerm"
						@focus="showSearchCancel = true"
					></cdx-search-input>
					<cdx-button
						v-if="showSearchCancel"
						action="default"
						weight="quiet"
						class="ext-wikilambda-app-z-multilingual-string-dialog__search-cancel"
						@click="clearSearch"
					>
						{{ i18n( 'wikilambda-cancel' ).text() }}
					</cdx-button>
				</div>
			</template>
			<!-- Dialog Body: Language Items block -->
			<div class="ext-wikilambda-app-z-multilingual-string-dialog__items">
				<section
					v-for="group in itemGroups"
					:key="group.id"
					class="ext-wikilambda-app-z-multilingual-string-dialog__group"
				>
					<h3
						v-if="group.title"
						class="ext-wikilambda-app-z-multilingual-string-dialog__group-title"
					>
						{{ group.title }}
					</h3>
					<ul class="ext-wikilambda-app-list-reset ext-wikilambda-app-z-multilingual-string-dialog__list">
						<li
							v-for="( item, index ) in group.items"
							:key="`dialog-lang-${group.id}-${index}`"
							class="ext-wikilambda-app-z-multilingual-string-dialog__item"
						>
							<button
								type="button"
								class="ext-wikilambda-app-button-reset
									ext-wikilambda-app-z-multilingual-string-dialog__item-button"
								@click="handleItemClick( item )"
							>
								<div
									class="ext-wikilambda-app-z-multilingual-string-dialog__item-title"
									:lang="item.langLabelData.langCode"
									:dir="item.langLabelData.langDir"
								>
									{{ item.langLabelData.label }}
								</div>
								<div class="ext-wikilambda-app-z-multilingual-string-dialog__item-field">
									<span v-if="item.isInList && !!item.value">{{ item.value }}</span>
									<span
										v-else
										class="ext-wikilambda-app-z-multilingual-string-dialog__item-add-language"
									>
										{{ i18n( 'wikilambda-monolingual-string-list-dialog-add-language' ).text() }}
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
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );
const { CdxButton, CdxDialog, CdxSearchInput } = require( '../../../codex.js' );
const Constants = require( '../../Constants.js' );
const CustomDialogHeader = require( '../base/CustomDialogHeader.vue' );
const LabelData = require( '../../store/classes/LabelData.js' );
const useMainStore = require( '../../store/index.js' );
const { createLabelComparator } = require( '../../utils/sortUtils.js' );
const urlUtils = require( '../../utils/urlUtils.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-multilingual-string-dialog',
	components: {
		'cdx-button': CdxButton,
		'cdx-dialog': CdxDialog,
		'cdx-search-input': CdxSearchInput,
		'wl-custom-dialog-header': CustomDialogHeader
	},
	props: {
		keyPath: {
			type: String,
			required: true,
			default: ''
		},
		open: {
			type: Boolean,
			required: true,
			default: false
		},
		items: {
			type: Array,
			required: true,
			default: () => []
		},
		edit: {
			type: Boolean,
			required: true,
			default: false
		}
	},
	emits: [ 'add-language', 'close-dialog' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		// Data access
		/**
		 * Returns true if the component is in the main namespace (editable mode).
		 *
		 * @return {boolean}
		 */
		const isMainObject = computed( () => props.keyPath.startsWith( Constants.STORED_OBJECTS.MAIN ) );

		// Lookup
		const lookupResults = ref( [] );
		let lookupAbortController = null;

		/**
		 * Performs a language lookup search and formats the results.
		 * Searches for natural language ZObjects that match the given substring.
		 * Cancels any previous search request and formats results for display.
		 * Results are sorted with new languages first, then existing ones.
		 *
		 * @param {string} substring - The search term to look up
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
						const langZid = result.page_title;
						const listItem = props.items.find(
							( itemData ) => itemData.langZid === langZid
						);
						const value = listItem ? listItem.value : '';
						const isInList = !!listItem;
						const isInVisibleList = listItem ? listItem.isInVisibleList : false;

						allZids.push( result.page_title );
						const langLabelData = new LabelData(
							result.page_title,
							result.label,
							result.match_lang,
							store.getLanguageIsoCodeOfZLang( result.match_lang )
						);
						return {
							langZid,
							langLabelData,
							isInList,
							isInVisibleList,
							value,
							hasValue: !!value
						};
					} )
					.filter( ( item ) => {
						if ( !isMainObject.value && !item.isInList ) {
							return false;
						}
						return true;
					} )
					.sort( ( a, b ) => {
						// Sort so that not-already-added languages come first
						if ( !a.isInList && b.isInList ) {
							return -1;
						}
						if ( a.isInList && !b.isInList ) {
							return 1;
						}
						// Then sort by whether they have values
						if ( a.hasValue && !b.hasValue ) {
							return -1;
						}
						if ( !a.hasValue && b.hasValue ) {
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

		// Search
		const searchTerm = ref( '' );
		const showSearchCancel = ref( false );

		/**
		 * Updates the search term and triggers search results update.
		 * When a new search term is entered, it clears previous results
		 * and triggers a new language lookup if the term is not empty.
		 *
		 * @param {string} value - The new search term entered by the user
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
		 * Clears the search field and resets search-related state.
		 * Resets the search term, clears lookup results, and hides the search cancel button.
		 * This provides a clean slate for new searches.
		 */
		function clearSearch() {
			searchTerm.value = '';
			updateSearchTerm( '' );
			showSearchCancel.value = false;
		}

		// Language Items
		/**
		 * Returns the list of items that are not already visible.
		 *
		 * @return {Array} Array of available items
		 */
		const getAvailableLanguages = computed( () => props.items.filter( ( item ) => !item.isInVisibleList ) );

		/**
		 * Returns the items available for the dialog.
		 *
		 * @return {Array} Array of dialog items
		 */
		const getDialogItems = computed( () => {
			const sortByLabel = createLabelComparator(
				store.getUserLangCode,
				( item ) => item.langLabelData.label
			);

			return getAvailableLanguages.value
				.map( ( { langZid, value = '' } ) => {
					const isInList = true; // All the items are already in the list
					const isInVisibleList = false; // All Items are not visible in the list, we just filtered them out
					const langLabelData = store.getLabelData( langZid );
					return {
						langZid,
						langLabelData,
						isInList,
						isInVisibleList,
						value,
						hasValue: !!value
					};
				} )
				.sort( sortByLabel );
		} );

		/**
		 * Returns suggested language items when there are no local items available.
		 * These are common languages that users can add to their multilingual string.
		 * In read-only mode (non-main namespace), only returns items already in the list.
		 *
		 * @return {Array} Array of suggested language items
		 */
		const getSuggestedItems = computed( () => Constants.SUGGESTIONS.LANGUAGES
			.map( ( langZid ) => {
				const langLabelData = store.getLabelData( langZid );
				const listItem = props.items.find(
					( itemData ) => itemData.langZid === langZid
				);
				const value = listItem ? listItem.value : '';
				const isInList = !!listItem;
				const isInVisibleList = listItem ? listItem.isInVisibleList : false;

				return {
					langZid,
					langLabelData,
					isInList,
					isInVisibleList,
					value,
					hasValue: false
				};
			} )
			.filter( ( item ) => {
				if ( !isMainObject.value && !item.isInList ) {
					return false;
				}
				return true;
			} ) );

		/**
		 * Returns grouped language items for local languages.
		 * Groups are: "Available" (if dialog items exist) or "Suggested" (if no dialog items).
		 *
		 * @return {Array}
		 */
		const localItems = computed( () => {
			const dialogItems = getDialogItems.value;
			const suggestedItems = getSuggestedItems.value;

			const groups = [];

			if ( dialogItems.length > 0 ) {
				// Add local items group
				groups.push( {
					id: 'available',
					title: i18n( 'wikilambda-monolingual-string-list-dialog-available' ).text(),
					items: dialogItems
				} );
			} else if ( suggestedItems.length > 0 ) {
				// Add suggested languages group
				groups.push( {
					id: 'suggested',
					title: i18n( 'wikilambda-monolingual-string-list-dialog-suggested' ).text(),
					items: suggestedItems
				} );
			}

			return groups;
		} );

		/**
		 * Returns grouped language items for both local languages and search results.
		 * For local languages, groups are: "Available" or "Suggested".
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

		// Dialog actions
		/**
		 * Closes the dialog and resets its state.
		 * Clears the search term, lookup results, and emits the 'close-dialog'
		 * event to notify the parent component that the dialog has been closed.
		 */
		function closeDialog() {
			searchTerm.value = '';
			lookupResults.value = [];
			showSearchCancel.value = false;
			emit( 'close-dialog' );
		}

		/**
		 * Emits the 'add-language' event to notify the parent component.
		 * This event triggers the addition of a new monolingual text item
		 * to the typed list. After emitting, the dialog is closed.
		 *
		 * @param {string} langZid - The ZID of the language to add
		 */
		function addLanguage( langZid ) {
			emit( 'add-language', langZid );
			closeDialog();
		}

		/**
		 * Navigates to the edit page when in read mode.
		 * Adds the 'action=edit' parameter to the current URL and redirects.
		 * This allows users to switch to edit mode to add new languages.
		 * The hash will be used to scroll to the relevant multilingual string component.
		 */
		function navigateToEdit() {
			const url = urlUtils.generateEditUrl( {
				langCode: store.getUserLangCode,
				zid: store.getCurrentZObjectId,
				hash: props.keyPath.replace( /\./g, '-' )
			} );

			// Navigate to the edit page with hash for automatic scrolling
			window.location.href = url;
		}

		/**
		 * Handles clicking on an item in the dialog.
		 * Determines the appropriate action based on item state and edit mode:
		 * - If item is already visible: closes dialog
		 * - If in read mode: adds language if in store, otherwise navigates to edit
		 * - If in edit mode: adds language to the typed list
		 *
		 * @param {Object} item - The clicked item with langZid and other properties
		 * @return {void}
		 */
		function handleItemClick( item ) {
			// Already visible → just close dialog
			if ( item.isInVisibleList ) {
				return closeDialog();
			}

			// Read mode → either add if already in store, or navigate to edit
			if ( !props.edit ) {
				return item.isInList ?
					addLanguage( item.langZid ) :
					navigateToEdit();
			}

			// Default → add language
			addLanguage( item.langZid );
		}

		// Data fetching
		/**
		 * Checks if there are no visible local items and fetches common language ZIDs if needed.
		 * This helper method centralizes the logic for determining when to fetch common languages.
		 */
		function fetchCommonLanguagesIfNeeded() {
			if ( getAvailableLanguages.value.length === 0 ) {
				store.fetchZids( { zids: Constants.SUGGESTIONS.LANGUAGES } );
			}
		}

		// Watch
		watch( () => props.items, () => {
			fetchCommonLanguagesIfNeeded();
		} );

		// Lifecycle
		onMounted( () => {
			fetchCommonLanguagesIfNeeded();
		} );

		// Return all properties and methods for the template
		return {
			clearSearch,
			closeDialog,
			handleItemClick,
			itemGroups,
			searchTerm,
			showSearchCancel,
			updateSearchTerm,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-z-multilingual-string-dialog {
	.cdx-dialog__body {
		padding: @spacing-50 0;
	}

	.ext-wikilambda-app-z-multilingual-string-dialog__search {
		padding: @spacing-100 0 0;
		display: flex;
		gap: @spacing-150;
	}

	.ext-wikilambda-app-z-multilingual-string-dialog__search-input {
		flex-grow: 1;
	}

	.ext-wikilambda-app-z-multilingual-string-dialog__search-cancel {
		flex-grow: 0;
	}

	.ext-wikilambda-app-z-multilingual-string-dialog__group-title {
		padding: @spacing-50 @spacing-150;
		margin: 0;
		font-weight: @font-weight-bold;
		color: @color-subtle;
		font-size: inherit;
	}

	.ext-wikilambda-app-z-multilingual-string-dialog__item {
		margin: 0;
		padding: 0;
	}

	.ext-wikilambda-app-z-multilingual-string-dialog__item-button {
		width: 100%;
		padding: @spacing-50 @spacing-150;
		text-align: left;

		&:hover {
			background-color: @background-color-interactive;
		}
	}

	.ext-wikilambda-app-z-multilingual-string-dialog__item-title {
		margin: 0;
	}

	.ext-wikilambda-app-z-multilingual-string-dialog__item-field {
		margin: 0;
		color: @color-subtle;
	}

	.ext-wikilambda-app-z-multilingual-string-dialog__item-add-language {
		.cdx-mixin-link();
	}
}
</style>
