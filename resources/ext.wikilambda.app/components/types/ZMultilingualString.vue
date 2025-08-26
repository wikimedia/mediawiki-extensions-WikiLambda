<!--
	WikiLambda Vue component for Z12/Multilingual String.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-multilingual-string" data-testid="z-multilingual-string">
		<div class="ext-wikilambda-app-multilingual-string__items">
			<div
				v-for="item in visibleItems"
				:key="item.langZid || item.keyPath"
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
					:title="$i18n( 'wikilambda-editor-zlist-additem-tooltip' ).text()"
					:aria-label="$i18n( 'wikilambda-editor-zlist-additem-tooltip' ).text()"
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
					{{ $i18n(
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
const { defineComponent } = require( 'vue' );
const { mapState, mapActions } = require( 'pinia' );

const icons = require( '../../../lib/icons.json' );
const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const zobjectMixin = require( '../../mixins/zobjectMixin.js' );
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
	mixins: [ zobjectMixin ],
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
	data: function () {
		return {
			iconLanguage: icons.cdxIconLanguage,
			iconAdd: icons.cdxIconAdd,
			showLoadMoreDialog: false,
			visibleLangZids: []
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getFallbackLanguageZids',
		'getUserLangZid'
	] ), {
		/**
		 * Returns the string representation of the expected type for the list items.
		 *
		 * @return {string}
		 */
		listItemType: function () {
			return Constants.Z_MONOLINGUALSTRING;
		},
		/**
		 * Returns common languages (English, Spanish, French) as ZIDs.
		 * These are used during initial view initialization to provide
		 * a consistent set of commonly used languages.
		 *
		 * @return {Array} Array of common language Z-IDs
		 */
		getCommonLanguages() {
			return [
				Constants.Z_NATURAL_LANGUAGE_ENGLISH,
				Constants.Z_NATURAL_LANGUAGE_SPANISH,
				Constants.Z_NATURAL_LANGUAGE_FRENCH
			];
		},

		/**
		 * Returns the array of all the monolingual text objects.
		 *
		 * @return {Array}
		 */
		values: function () {
			return this.getZMultilingualValues( this.objectValue );
		},

		/**
		 * Returns the array of all terminal language values
		 *
		 * @return {Array}
		 */
		langs: function () {
			return this.getZMultilingualLangs( this.objectValue );
		},

		/**
		 * Returns the key path for the list of items.
		 *
		 * @return {string}
		 */
		listKeyPath: function () {
			return `${ this.keyPath }.${ Constants.Z_MULTILINGUALSTRING_VALUE }`;
		},

		/**
		 * Returns the total count of store items.
		 *
		 * @return {number}
		 */
		loadMoreItemsCount: function () {
			return this.values.length;
		},

		/**
		 * Returns all items from the store with their metadata.
		 * Maps each store item to include index, objectValue, langZid, keyPath, and uniqueKey.
		 *
		 * @return {Array} Array of item objects with metadata
		 */
		allViewItems() {
			return this.values
				.map( ( objectValue, index ) => {
					const langZid = this.getZMonolingualLangValue( objectValue );
					const value = this.getZMonolingualTextValue( objectValue );
					return {
						objectValue,
						langZid,
						value,
						keyPath: `${ this.listKeyPath }.${ index + 1 }`
					};
				} );
		},

		/**
		 * Returns all items sorted by language priority.
		 * For monolingual string lists: user language first, then fallback languages,
		 * then user-added languages in order, then blank items last.
		 *
		 * @return {Array} Array of items sorted by priority
		 */
		allViewItemsSorted() {
			return [ ...this.allViewItems ].sort( ( a, b ) => this.sortItemsByPriority( a, b ) );
		},

		/**
		 * Returns the items currently visible in the typed list.
		 * Combines visible language items (in user-defined order)
		 * with blank items (always at the end).
		 *
		 * @return {Array} Array of visible items
		 */
		visibleItems() {
			const visible = this.visibleLangZids
				.map( ( langZid ) => this.allViewItems.find( ( item ) => item.langZid === langZid ) )
				.filter( Boolean );

			// Always include blank items (no langZid) at the end
			const blanks = this.allViewItems.filter( ( item ) => this.isBlankItem( item ) );

			return [ ...visible, ...blanks ];
		},

		/**
		 * Returns items available for the dialog (not currently visible in the typed list).
		 * Filters out items without language ZIDs and maps them to the structure expected by the dialog.
		 * Used to populate the ZMultilingualStringDialog with available languages.
		 *
		 * @return {Array} Array of items available for dialog selection
		 */
		dialogItems() {
			return this.allViewItems
				.filter( ( item ) => item.langZid )
				.map( ( { langZid, objectValue, value } ) => ( {
					objectValue,
					value,
					langZid,
					isInVisibleList: this.visibleLangZids.includes( langZid )
				} ) );
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'createZMonolingualString',
		'pushItemsByKeyPath',
		'setDirty'
	] ), {
		/**
		 * Adds an item of the given value to the list
		 *
		 * @param {Object} payload
		 * @param {string} payload.lang
		 */
		addListItem: function ( payload ) {
			const value = canonicalToHybrid( this.createZMonolingualString( payload ) );
			this.pushItemsByKeyPath( {
				keyPath: this.listKeyPath.split( '.' ),
				values: [ value ]
			} );
			this.setDirtyIfMainObject();
		},

		/**
		 * Adds a blank item to the list.
		 */
		addBlankListItem: function () {
			this.addListItem( { lang: '' } );
		},

		/**
		 * Adds a language from the dialog to the typed list.
		 * If the language already exists in the store, it's made visible.
		 * If it doesn't exist, emits an event to add it to the store first.
		 * Finally, adds the language ZID to the visible languages array.
		 *
		 * @param {string} langZid
		 */
		addLanguageFromDialog: function ( langZid ) {
			// If the language doesn't exist in the store, add it to the store
			if ( !this.allViewItems.some( ( item ) => item.langZid === langZid ) ) {
				this.addListItem( { lang: langZid } );
			}
			this.visibleLangZids = [ ...new Set( [ ...this.visibleLangZids, langZid ] ) ];
		},

		/**
		 * Opens the load more dialog.
		 * Sets the showLoadMoreDialog flag to true, which displays
		 * the ZMultilingualStringDialog component.
		 */
		openLoadMoreDialog: function () {
			this.showLoadMoreDialog = true;
		},

		/**
		 * Closes the load more dialog.
		 * Sets the showLoadMoreDialog flag to false, which hides
		 * the ZMultilingualStringDialog component.
		 */
		closeLoadMoreDialog: function () {
			this.showLoadMoreDialog = false;
		},

		/**
		 * Sets object isDirty flag as true only if the changes
		 * are made in the main page object.
		 */
		setDirtyIfMainObject: function () {
			if ( this.keyPath.startsWith( Constants.STORED_OBJECTS.MAIN ) ) {
				this.setDirty();
			}
		},

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
		getPriority: function ( langZid ) {
			// for user language
			if ( langZid === this.getUserLangZid ) {
				return 1;
			}
			// for fallback languages
			if ( this.getFallbackLanguageZids.includes( langZid ) ) {
				return 2;
			}
			// keep relative order
			const idx = this.visibleLangZids.indexOf( langZid );
			if ( idx !== -1 ) {
				return 3 + idx;
			}
			// blanks last
			if ( !langZid ) {
				return 999;
			}
			// other langs
			return 500;
		},
		/**
		 * Sorts items by calculated priority, then alphabetically by langZid.
		 *
		 * @param {Object} a
		 * @param {Object} b
		 * @return {number}
		 */
		sortItemsByPriority: function ( a, b ) {
			const pa = this.getPriority( a.langZid );
			const pb = this.getPriority( b.langZid );
			// by priority
			if ( pa !== pb ) {
				return pa - pb;
			}
			// alphabetically by langZid
			const la = a.langZid || '';
			const lb = b.langZid || '';
			return la.localeCompare( lb );
		},

		/**
		 * Checks if an item is blank (no language and no text content).
		 * Blank items should be automatically expanded to allow easy editing.
		 *
		 * @param {Object} item - The item to check
		 * @return {boolean} True if the item is blank
		 */
		isBlankItem: function ( item ) {
			return !item.langZid;
		},

		/**
		 * Initializes the multilingual string list with its initial set of visible languages.
		 * Populates visibleLangZids with priority languages in order:
		 * 1) User language, 2) Fallback languages, 3) Common languages (English, Spanish, French).
		 * Respects the display limit and adds a fallback item if no priority languages are found.
		 * The remaining languages will be available through the ZMultilingualStringDialog component.
		 */
		initializeMultilingualStringList: function () {
			const candidates = [
				this.getUserLangZid,
				...this.getFallbackLanguageZids,
				...this.getCommonLanguages
			];
			// Deduplicate while preserving order and keep only langs actually present in store
			let visibleLangZids = [ ...new Set( candidates ) ].filter( ( l ) => this.langs.includes( l ) );
			// Enforce maximum length
			visibleLangZids = visibleLangZids.slice( 0, Constants.LIST_LIMIT_MULTILINGUAL_STRING );

			// Fallback to first language in list if still empty
			if ( !visibleLangZids.length && this.allViewItemsSorted[ 0 ] && this.allViewItemsSorted[ 0 ].langZid ) {
				visibleLangZids = [ this.allViewItemsSorted[ 0 ].langZid ];
			}
			this.visibleLangZids = visibleLangZids;
		}
	} ),
	watch: {
		/**
		 * Watches for changes in the store to detect additions/deletions.
		 * When objectValue changes, cleans up any stale langZids that are
		 * no longer present in the store, ensuring the visible list stays
		 * synchronized with the actual data.
		 */
		langs: {
			/**
			 * Keep any newly added languages visible and remove stale ones.
			 * This ensures a blank item that gets a language stays on screen.
			 *
			 * @param {Array} newLangs
			 * @param {Array} oldLangs
			 */
			handler: function ( newLangs = [], oldLangs = [] ) {
				const prevLangs = Array.isArray( oldLangs ) ? oldLangs : [];
				const addedLangs = newLangs.filter( ( lang ) => lang && !prevLangs.includes( lang ) );

				// Keep only valid current langs, then append new ones (dedupe via Set)
				this.visibleLangZids = [
					...new Set( [
						...this.visibleLangZids.filter( ( zid ) => newLangs.includes( zid ) ),
						...addedLangs
					] )
				];
			},
			deep: false
		}
	},
	mounted: function () {
		// Initialize the multilingual string list with priority languages
		this.initializeMultilingualStringList();
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

	.ext-wikilambda-app-multilingual-string__load-more {
		margin-top: @spacing-75;
	}

	.ext-wikilambda-app-multilingual-string__add-button {
		margin-top: @spacing-75;
		margin-bottom: @spacing-75;
	}
}
</style>
