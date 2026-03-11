<!--
	WikiLambda Vue component for an Abstract Content section.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-abstract-content-section">
		<!-- Section title: label of section Qid in the user language -->
		<div class="ext-wikilambda-app-abstract-content-section-title">
			<h2>
				{{ section.labelData.label }} <span>({{ section.qid }})</span>
			</h2>
		</div>
		<!-- Section fragments -->
		<template v-for="( fragment, index ) in section.fragments">
			<!-- TODO: we should probably remove the benjamin item from the
			fragments list, then we can remove the v-if and wrapper template -->
			<wl-abstract-content-fragment
				v-if="index !== 0"
				:key="`${ section.fragmentsPath }-${ index }`"
				class="ext-wikilambda-app-abstract-content-section-fragment"
				:edit="edit"
				:key-path="`${ section.fragmentsPath }.${ index }`"
				:fragment="fragment"
				@action="performAction( $event, index )"
			></wl-abstract-content-fragment>
		</template>
		<!-- Add fragment menu button in edit mode -->
		<cdx-menu-button
			v-if="edit"
			class="ext-wikilambda-app-abstract-content-section-fragment-menu"
			action="default"
			weight="normal"
			:aria-label="i18n( 'wikilambda-abstract-menu-fragments-accessible-label' ).text()"
			:menu-items="menuItems"
			:selected="null"
			@update:selected="addFragment"
		>
			<cdx-icon :icon="iconAdd"></cdx-icon>
		</cdx-menu-button>
		<wl-clipboard-dialog
			:open="showClipboard"
			expected-type="Z89"
			@close-dialog="closeClipboard"
			@paste="pasteFromClipboard"
		></wl-clipboard-dialog>
	</div>
</template>

<script>
const { computed, defineComponent, inject, ref } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useMenuAction = require( '../../composables/useMenuAction.js' );
const useMainStore = require( '../../store/index.js' );
const icons = require( '../../../lib/icons.json' );

// Abstract components
const AbstractContentFragment = require( './AbstractContentFragment.vue' );
// Base components
const ClipboardDialog = require( '../base/ClipboardDialog.vue' );
// Codex components
const { CdxMenuButton, CdxIcon } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-content-section',
	components: {
		'wl-abstract-content-fragment': AbstractContentFragment,
		'wl-clipboard-dialog': ClipboardDialog,
		'cdx-menu-button': CdxMenuButton,
		'cdx-icon': CdxIcon
	},
	props: {
		section: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	setup( props ) {
		const store = useMainStore();
		const i18n = inject( 'i18n' );
		const menuActions = inject( 'useMenuAction', useMenuAction );
		const {
			addAfter,
			addBefore,
			addListItem,
			moveAfter,
			moveBefore,
			deleteListItem
		} = menuActions();

		const iconAdd = icons.cdxIconAdd;

		// Clipboard vars
		const showClipboard = ref( false );
		const copyToKeyPath = ref( null );

		/**
		 * Close clipboard dialog with no action.
		 */
		function closeClipboard() {
			showClipboard.value = false;
			copyToKeyPath.value = null;
		}

		/**
		 * Paste selected item from clipboard dialog as the value
		 * for this key and close the clipboard dialog.
		 *
		 * @param {Object} item
		 */
		function pasteFromClipboard( item ) {
			const cleanValue = store.cleanClipboardItem( item.value, copyToKeyPath.value );
			store.setValueByKeyPath( {
				keyPath: copyToKeyPath.value.split( '.' ),
				value: cleanValue
			} );

			// Set page as dirty and set fragment as dirty
			store.setDirty();
			store.setDirtyFragment( copyToKeyPath.value );

			closeClipboard();
		}

		/**
		 * Returns the menu items for the Add fragment [+] menu button.
		 *
		 * @return {Array}
		 */
		const menuItems = computed( () => {
			const basicActionGroup = {
				label: i18n( 'wikilambda-abstract-menu-group-basic-fragments' ).text(),
				hideLabel: true,
				items: [ {
					label: i18n( 'wikilambda-abstract-menu-option-add-empty-fragment' ).text(),
					value: Constants.LIST_MENU_OPTIONS.ADD_FRAGMENT
				} ]
			};
			const specialActionGroup = {
				label: i18n( 'wikilambda-abstract-menu-group-special-fragments' ).text(),
				hideLabel: true,
				items: store.getSuggestedHtmlFunctions.map( ( zid ) => ( {
					label: i18n( 'wikilambda-abstract-menu-option-add-named-fragment',
						store.getLabelData( zid ).label ).text(),
					value: zid
				} ) )
			};
			return store.getSuggestedHtmlFunctions.length > 0 ?
				[ basicActionGroup, specialActionGroup ] :
				[ basicActionGroup ];
		} );

		/**
		 * Adds a new fragment at the end of the list
		 *
		 * @param {string} value
		 */
		function addFragment( value ) {
			if ( value === Constants.LIST_MENU_OPTIONS.ADD_FRAGMENT ) {
				addListItem(
					{ type: Constants.Z_FUNCTION_CALL },
					props.section.fragmentsPath,
					props.section.fragments.length
				);
				return;
			}

			// Any other value is a zid, we need to:
			// * make sure it's a function zid
			// * make sure function returns HTML
			// * create function call to this function
			// * insert it as a fragment
			const obj = store.getStoredObject( value );
			if ( !obj ) {
				// Not found object, do nothing
				return;
			}

			const inner = obj[ Constants.Z_PERSISTENTOBJECT_VALUE ];
			const type = inner[ Constants.Z_OBJECT_TYPE ];
			if ( type !== Constants.Z_FUNCTION ) {
				// Not a function, do nothing
				return;
			}

			const output = inner[ Constants.Z_FUNCTION_RETURN_TYPE ];
			if ( output !== Constants.Z_HTML_FRAGMENT ) {
				// Return type is not HTML, do nothing
				return;
			}

			// All good, insert function call to given function zid
			const newItemPath = `${ props.section.fragmentsPath }.${ props.section.fragments.length }`;
			addListItem(
				{ type: Constants.Z_FUNCTION_CALL, value },
				props.section.fragmentsPath,
				props.section.fragments.length
			);
			store.setFunctionCallArguments( {
				keyPath: newItemPath.split( '.' ),
				functionZid: value
			} );
		}

		/**
		 * Handles all actions triggered from the fragment component
		 *
		 * @param {Object} payload
		 * @param {string} payload.action
		 * @param {number} itemKey
		 */
		function performAction( payload, itemKey ) {
			const itemKeyPath = `${ props.section.fragmentsPath }.${ itemKey }`;

			if ( payload.action === Constants.LIST_MENU_OPTIONS.MOVE_BEFORE ) {
				moveBefore( itemKeyPath );
				return;
			}

			if ( payload.action === Constants.LIST_MENU_OPTIONS.MOVE_AFTER ) {
				moveAfter( itemKeyPath );
				return;
			}

			if ( payload.action === Constants.LIST_MENU_OPTIONS.ADD_BEFORE ) {
				addBefore( { type: Constants.Z_FUNCTION_CALL }, itemKeyPath );
				return;
			}

			if ( payload.action === Constants.LIST_MENU_OPTIONS.ADD_AFTER ) {
				addAfter( { type: Constants.Z_FUNCTION_CALL }, itemKeyPath );
				return;
			}

			if ( payload.action === Constants.LIST_MENU_OPTIONS.DELETE_ITEM ) {
				deleteListItem( itemKeyPath );
				return;
			}

			if ( payload.action === Constants.LIST_MENU_OPTIONS.COPY_CLIPBOARD ) {
				store.copyToClipboard( {
					originKey: `${ props.section.qid }.${ itemKey }`,
					originSlotType: Constants.Z_HTML_FRAGMENT,
					value: props.section.fragments[ itemKey ]
				} );
				return;
			}

			if ( payload.action === Constants.LIST_MENU_OPTIONS.PASTE_CLIPBOARD ) {
				showClipboard.value = true;
				copyToKeyPath.value = itemKeyPath;
				return;
			}
		}

		return {
			closeClipboard,
			pasteFromClipboard,
			showClipboard,
			addFragment,
			menuItems,
			performAction,
			iconAdd,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-content-section {
	margin-bottom: @spacing-150;
}
</style>
