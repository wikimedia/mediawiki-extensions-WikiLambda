<!--
	WikiLambda Vue component for Z12/Multilingual String.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-multilingual-string" data-testid="z-multilingual-string">
		<div class="ext-wikilambda-app-multilingual-string__items">
			<!-- Show empty state when no items -->
			<div
				v-if="visibleItems.length === 0"
				class="ext-wikilambda-app-multilingual-string__empty-state"
			>
				{{ i18n( 'wikilambda-list-empty-state' ).text() }}
			</div>
			<!-- Show multilingual string items -->
			<div
				v-for="item in visibleItems"
				:key="item.keyPath"
				class="ext-wikilambda-app-multilingual-string__item">
				<wl-z-object-key-value
					class="ext-wikilambda-app-typed-list-items__block"
					:key-path="item.keyPath"
					:object-value="item.objectValue"
					:edit="edit"
					:parent-list-item-type="listItemType"
					:default-expanded="edit && isBlankItem( item )"
				></wl-z-object-key-value>
			</div>
		</div>
		<div class="ext-wikilambda-app-multilingual-string__footer">
			<!-- Button to add a new item -->
			<div
				v-if="edit"
				class="ext-wikilambda-app-multilingual-string__add-button"
			>
				<cdx-button
					:title="i18n( 'wikilambda-editor-zlist-additem-tooltip' ).text()"
					:aria-label="i18n( 'wikilambda-editor-zlist-additem-tooltip' ).text()"
					data-testid="multilingual-string-add-item"
					action="default"
					@click="addBlankListItem"
				>
					<cdx-icon :icon="iconAdd"></cdx-icon>
				</cdx-button>
			</div>
			<!-- Button to load more items -->
			<div
				class="ext-wikilambda-app-multilingual-string__load-more"
			>
				<cdx-button
					data-testid="multilingual-string-load-more"
					action="default"
					@click="openLoadMoreDialog"
				>
					<cdx-icon :icon="iconLanguage"></cdx-icon>
					{{ i18n(
						'wikilambda-editor-multilingual-string-loadmore',
						loadMoreItemsCount
					).text() }}
				</cdx-button>
			</div>
		</div>
		<wl-z-multilingual-string-dialog
			:open="showLoadMoreDialog"
			:key-path="keyPath"
			:items="dialogItems"
			:edit="edit"
			@add-language="addLanguageFromDialog"
			@close-dialog="closeLoadMoreDialog"
		></wl-z-multilingual-string-dialog>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );

const icons = require( '../../../lib/icons.json' );
const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const useZObject = require( '../../composables/useZObject.js' );
const { canonicalToHybrid } = require( '../../utils/schemata.js' );
// Type components
const ZMultilingualStringDialog = require( './ZMultilingualStringDialog.vue' );
// Codex components
const { CdxButton, CdxIcon } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-multilingual-string',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'wl-z-multilingual-string-dialog': ZMultilingualStringDialog
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true,
			default: false
		}
	},
	setup( props ) {
		const i18n = inject( 'i18n' );
		const {
			getZMonolingualLangValue,
			getZMonolingualTextValue,
			getZMultilingualLangs,
			getZMultilingualValues
		} = useZObject( { keyPath: props.keyPath } );
		const store = useMainStore();

		// Reactive data
		const listItemType = Constants.Z_MONOLINGUALSTRING;
		const iconLanguage = icons.cdxIconLanguage;
		const iconAdd = icons.cdxIconAdd;
		const showLoadMoreDialog = ref( false );
		const visibleLangZids = ref( [] );

		// Computed properties
		/**
		 * Returns the array of all the monolingual text objects.
		 *
		 * @return {Array}
		 */
		const values = computed( () => getZMultilingualValues( props.objectValue ) );

		/**
		 * Returns the array of all terminal language values
		 *
		 * @return {Array}
		 */
		const langs = computed( () => getZMultilingualLangs( props.objectValue ) );

		/**
		 * Returns the key path for the list of items.
		 *
		 * @return {string}
		 */
		const listKeyPath = computed( () => `${ props.keyPath }.${ Constants.Z_MULTILINGUALSTRING_VALUE }` );

		/**
		 * Returns the total count of store items.
		 *
		 * @return {number}
		 */
		const loadMoreItemsCount = computed( () => values.value.length );

		/**
		 * Checks if an item is blank (no language and no text content).
		 * Blank items should be automatically expanded to allow easy editing.
		 *
		 * @param {Object} item - The item to check
		 * @return {boolean} True if the item is blank
		 */
		function isBlankItem( item ) {
			return !item.langZid;
		}

		/**
		 * Returns all items from the store with their metadata.
		 * Maps each store item to include index, objectValue, langZid, keyPath, and uniqueKey.
		 * Handles conversion from ISO codes to ZIDs for consistent language references.
		 *
		 * @return {Array} Array of item objects with metadata
		 */
		const allViewItems = computed( () => values.value.map( ( objectValue, index ) => {
			const lang = getZMonolingualLangValue( objectValue );
			const value = getZMonolingualTextValue( objectValue );
			// Get the ZID for the language if it exists, otherwise use the lang (which can already be a ZID)
			const langZid = store.getLanguageZidOfCode( lang ) || lang;

			return {
				keyPath: `${ listKeyPath.value }.${ index + 1 }`,
				langZid,
				objectValue,
				value
			};
		} )
		);

		/**
		 * Returns a numeric priority for a given language ZID:
		 * 1 User language
		 * 2 Fallbacks
		 * 3+ visible order
		 * 500 others
		 * 999 blanks
		 *
		 * @param {string|undefined} langZid
		 * @return {number}
		 */
		function getPriority( langZid ) {
			// for user language
			if ( langZid === store.getUserLangZid ) {
				return 1;
			}
			// for fallback languages
			if ( store.getFallbackLanguageZids.includes( langZid ) ) {
				return 2;
			}
			// keep relative order
			const idx = visibleLangZids.value.indexOf( langZid );
			if ( idx !== -1 ) {
				return 3 + idx;
			}
			// blanks last
			if ( !langZid ) {
				return 999;
			}
			// other langs
			return 500;
		}

		/**
		 * Sorts items by calculated priority, then alphabetically by langZid.
		 *
		 * @param {Object} a
		 * @param {Object} b
		 * @return {number}
		 */
		function sortItemsByPriority( a, b ) {
			const pa = getPriority( a.langZid );
			const pb = getPriority( b.langZid );
			// by priority
			if ( pa !== pb ) {
				return pa - pb;
			}
			// alphabetically by langZid
			const la = a.langZid || '';
			const lb = b.langZid || '';
			return la.localeCompare( lb );
		}

		/**
		 * Returns all items sorted by language priority.
		 * For monolingual string lists: user language first, then fallback languages,
		 * then user-added languages in order, then blank items last.
		 *
		 * @return {Array} Array of items sorted by priority
		 */
		const allViewItemsSorted = computed( () => [ ...allViewItems.value ]
			.sort( ( a, b ) => sortItemsByPriority( a, b ) ) );

		/**
		 * Returns the items currently visible in the typed list.
		 * Combines visible language items (in user-defined order)
		 * with blank items (always at the end).
		 *
		 * @return {Array} Array of visible items
		 */
		const visibleItems = computed( () => {
			const visible = visibleLangZids.value
				.map( ( langZid ) => allViewItems.value.find( ( item ) => item.langZid === langZid ) )
				.filter( Boolean );

			// Always include blank items (no langZid) at the end
			const blanks = allViewItems.value.filter( ( item ) => isBlankItem( item ) );

			return [ ...visible, ...blanks ];
		} );

		/**
		 * Returns items available for the dialog (not currently visible in the typed list).
		 * Filters out items without language ZIDs and maps them to the structure expected by the dialog.
		 * Used to populate the ZMultilingualStringDialog with available languages.
		 *
		 * @return {Array} Array of items available for dialog selection
		 */
		const dialogItems = computed( () => allViewItems.value
			.filter( ( item ) => item.langZid )
			.map( ( { langZid, objectValue, value } ) => ( {
				objectValue,
				value,
				langZid,
				isInVisibleList: visibleLangZids.value.includes( langZid )
			} ) ) );

		/**
		 * Sets object isDirty flag as true only if the changes
		 * are made in the main page object.
		 */
		function setDirtyIfMainObject() {
			if ( props.keyPath.startsWith( Constants.STORED_OBJECTS.MAIN ) ) {
				store.setDirty();
			}
		}

		/**
		 * Adds an item of the given value to the list
		 *
		 * @param {Object} payload
		 * @param {string} payload.lang
		 */
		function addListItem( payload ) {
			const value = canonicalToHybrid( store.createZMonolingualString( payload ) );
			store.pushItemsByKeyPath( {
				keyPath: listKeyPath.value.split( '.' ),
				values: [ value ]
			} );
			setDirtyIfMainObject();
		}

		/**
		 * Adds a blank item to the list.
		 */
		function addBlankListItem() {
			addListItem( { lang: '' } );
		}

		/**
		 * Adds a language from the dialog to the typed list.
		 * Adds the language to the store if needed and adds the language's ZID to the visible list.
		 *
		 * @param {string} langZid - ZID for the language
		 */
		function addLanguageFromDialog( langZid ) {
			// If the language doesn't exist in the store, add it to the store
			if ( !allViewItems.value.some( ( item ) => item.langZid === langZid ) ) {
				addListItem( { lang: langZid } );
			}
			// Add the ZID to the visible list
			visibleLangZids.value = [ ...new Set( [ ...visibleLangZids.value, langZid ] ) ];
		}

		/**
		 * Opens the load more dialog.
		 * Sets the showLoadMoreDialog flag to true, which displays
		 * the ZMultilingualStringDialog component.
		 */
		function openLoadMoreDialog() {
			showLoadMoreDialog.value = true;
		}

		/**
		 * Closes the load more dialog.
		 * Sets the showLoadMoreDialog flag to false, which hides
		 * the ZMultilingualStringDialog component.
		 */
		function closeLoadMoreDialog() {
			showLoadMoreDialog.value = false;
		}

		/**
		 * Initializes the multilingual string list with its initial set of visible languages.
		 * Populates visibleLangZids with priority languages in order:
		 * 1) User language, 2) Fallback languages, 3) Suggested languages.
		 * Respects the display limit and adds a fallback item if no priority languages are found.
		 * The remaining languages will be available through the ZMultilingualStringDialog component.
		 */
		function initializeMultilingualStringList() {
			const candidates = [ ...new Set( [
				store.getUserLangZid,
				...store.getFallbackLanguageZids,
				...Constants.SUGGESTIONS.LANGUAGES
			] ) ];

			// Filter items that match any of the candidate ZIDs
			const matchingItems = allViewItemsSorted.value.filter(
				( item ) => item.langZid && candidates.includes( item.langZid )
			);

			// Extract the ZIDs from matching items
			let visibleLangs = matchingItems.map( ( item ) => item.langZid );

			// Enforce maximum length
			visibleLangs = visibleLangs.slice( 0, Constants.LIST_LIMIT_MULTILINGUAL_STRING );

			// Fallback to first language in list if still empty
			if (
				!visibleLangs.length &&
				allViewItemsSorted.value[ 0 ] &&
				allViewItemsSorted.value[ 0 ].langZid
			) {
				visibleLangs = [ allViewItemsSorted.value[ 0 ].langZid ];
			}
			visibleLangZids.value = visibleLangs;
		}

		/**
		 * Fetches ZIDs for languages that were converted from ISO codes to ZIDs.
		 * This ensures that language objects are available in the store for proper display.
		 */
		function fetchMissingLanguageZids() {
			const zids = [];

			// Check all items for converted languages
			allViewItems.value.forEach( ( { langZid } ) => {
				if ( langZid && !store.getStoredObject( langZid ) ) {
					zids.push( langZid );
				}
			} );

			// Fetch any missing ZIDs
			if ( zids.length > 0 ) {
				store.fetchZids( { zids } );
			}
		}

		/**
		 * Watches for changes in the store to detect additions/deletions.
		 * Keep any newly added languages visible and remove stale ones.
		 * This ensures a blank item that gets a language stays on screen.
		 * Handles both ZID references and literal ISO codes by normalizing to ZIDs.
		 */
		watch( langs, ( newLangs = [], oldLangs = [] ) => {
			// Convert all langs to ZIDs for consistent comparison
			const newLangZids = newLangs
				.map( ( lang ) => store.getLanguageZidOfCode( lang ) || lang )
				.filter( Boolean );

			const prevLangs = Array.isArray( oldLangs ) ? oldLangs : [];
			const prevLangZids = prevLangs
				.map( ( lang ) => store.getLanguageZidOfCode( lang ) || lang )
				.filter( Boolean );

			const addedLangZids = newLangZids.filter( ( zid ) => !prevLangZids.includes( zid ) );

			// Keep only valid current ZIDs, then append new ones (dedupe via Set)
			visibleLangZids.value = [
				...new Set( [
					...visibleLangZids.value.filter( ( langZid ) => newLangZids.includes( langZid ) ),
					...addedLangZids
				] )
			];
		} );

		// Lifecycle
		onMounted( () => {
			// Initialize the multilingual string list with priority languages
			initializeMultilingualStringList();

			// Fetch ZIDs for any ISO codes that were converted from literal Z60 objects
			fetchMissingLanguageZids();
		} );

		return {
			addBlankListItem,
			addLanguageFromDialog,
			closeLoadMoreDialog,
			dialogItems,
			iconAdd,
			iconLanguage,
			isBlankItem,
			listItemType,
			loadMoreItemsCount,
			openLoadMoreDialog,
			showLoadMoreDialog,
			visibleItems,
			i18n
		};
	},
	beforeCreate: function () {
		this.$options.components[ 'wl-z-object-key-value' ] = require( './ZObjectKeyValue.vue' );
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-multilingual-string {
	margin-bottom: 0;

	.ext-wikilambda-app-multilingual-string__item {
		margin-bottom: @spacing-50;
	}

	.ext-wikilambda-app-multilingual-string__load-more {
		margin-bottom: @spacing-50;
	}

	.ext-wikilambda-app-multilingual-string__add-button {
		margin-bottom: @spacing-50;
		margin-top: @spacing-50;
	}

	.ext-wikilambda-app-multilingual-string__empty-state {
		color: @color-placeholder;
	}
}
</style>
