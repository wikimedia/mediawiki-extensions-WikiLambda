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
		<div ref="listRef" class="ext-wikilambda-app-abstract-content-section-fragments">
			<!-- The key must be on the template: then a fragment component moves
			with its fragment. A key on the inner element makes Vue compare the
			list by position, so a move would remount the moved fragments. -->
			<template
				v-for="( fragment, index ) in section.fragments"
				:key="getListItemKey( fragment, index )"
			>
				<!-- TODO: we should probably remove the benjamin item from the
				fragments list, then we can remove the v-if and wrapper template -->
				<wl-abstract-content-fragment
					v-if="index !== 0"
					class="ext-wikilambda-app-abstract-content-section-fragment"
					:edit="edit"
					:key-path="`${ section.fragmentsPath }.${ index }`"
					:fragment="fragment"
					:dragging="isDragging"
					:dragged="draggedIndex === index"
					@action="performAction( $event, index )"
					@rehash="regenerateHash( fragment, index )"
					@dragstart="startDrag( $event, index )"
				></wl-abstract-content-fragment>
			</template>
			<!-- Line that shows where the dragged fragment goes -->
			<div
				v-if="insertionOffset !== null"
				class="ext-wikilambda-app-abstract-content-section-insertion"
				:style="{ top: `${ insertionOffset }px` }"
			></div>
		</div>
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
const { computed, defineComponent, inject, nextTick, ref } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useEventLog = require( '../../composables/useEventLog.js' );
const useFragmentDrag = require( '../../composables/useFragmentDrag.js' );
const useMenuAction = require( '../../composables/useMenuAction.js' );
const useMainStore = require( '../../store/index.js' );
const icons = require( '../../../lib/icons.json' );
const { sha256, stabilize } = require( '../../utils/miscUtils.js' );
const { getListItemKey } = require( '../../utils/zobjectUtils.js' );

// Abstract components
const AbstractContentFragment = require( './AbstractContentFragment.vue' );
// Base components
const ClipboardDialog = require( '../base/ClipboardDialog.vue' );
// Codex components
const { CdxMenuButton, CdxIcon } = require( '../../../codex.js' );

// Event subtypes for the fragment actions that we log. The clipboard actions are
// absent on purpose: the clipboard store and dialog log them as copy and paste.
const FRAGMENT_ACTION_SUBTYPES = {
	[ Constants.LIST_MENU_OPTIONS.MOVE_BEFORE ]: 'move_fragment_before',
	[ Constants.LIST_MENU_OPTIONS.MOVE_AFTER ]: 'move_fragment_after',
	[ Constants.LIST_MENU_OPTIONS.ADD_BEFORE ]: 'add_fragment_before',
	[ Constants.LIST_MENU_OPTIONS.ADD_AFTER ]: 'add_fragment_after',
	[ Constants.LIST_MENU_OPTIONS.DELETE_ITEM ]: 'delete_fragment'
};

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
		const { submitInteraction } = useEventLog();
		const menuActions = inject( 'useMenuAction', useMenuAction );
		const {
			addAfter,
			addBefore,
			addListItem,
			moveAfter,
			moveBefore,
			moveTo,
			deleteListItem,
			openFunctionCallLink
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

			// Set page as dirty
			store.setDirty();

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
				submitInteraction( 'change', store.getInteractionData, 'add_fragment_empty' );
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

			// Record which suggested function the user chose
			const interactionData = Object.assign( {}, store.getInteractionData, {
				selectedfunctionzid: value
			} );
			submitInteraction( 'change', interactionData, 'add_fragment_suggested' );
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

			const subtype = FRAGMENT_ACTION_SUBTYPES[ payload.action ];
			if ( subtype ) {
				submitInteraction( 'change', store.getInteractionData, subtype );
			}

			if ( payload.action === Constants.LIST_MENU_OPTIONS.MOVE_BEFORE ) {
				keepFocus( () => moveBefore( itemKeyPath ) );
				return;
			}

			if ( payload.action === Constants.LIST_MENU_OPTIONS.MOVE_AFTER ) {
				keepFocus( () => moveAfter( itemKeyPath ) );
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

			if ( payload.action === Constants.LIST_MENU_OPTIONS.TRY_FUNCTION_CALL ) {
				openFunctionCallLink( itemKeyPath );
				return;
			}
		}

		// Fragment dragging
		// =================
		// The fragments carry a drag handle, but this component owns the drag:
		// it knows the position of every fragment of the section, and it holds
		// the line that shows where the dragged fragment goes.

		const listRef = ref( null );

		/**
		 * Returns the rectangle of the fragment list, or null before the
		 * component draws the list.
		 *
		 * @return {Object|null}
		 */
		function getListRect() {
			return listRef.value ? listRef.value.getBoundingClientRect() : null;
		}

		/**
		 * Returns the rectangles of the fragments, in list order.
		 * The list holds no rectangle for the benjamin item, so the first
		 * rectangle belongs to the fragment in position 1.
		 *
		 * @return {Array<Object>}
		 */
		function getFragmentRects() {
			if ( !listRef.value ) {
				return [];
			}
			const elements = listRef.value.querySelectorAll(
				'.ext-wikilambda-app-abstract-content-section-fragment'
			);
			return Array.from( elements ).map( ( element ) => element.getBoundingClientRect() );
		}

		const {
			isDragging,
			draggedIndex,
			insertionOffset,
			startDrag
		} = useFragmentDrag( {
			getListRect,
			getFragmentRects,
			onDrop: ( fragmentIndex, targetIndex ) => {
				moveTo( `${ props.section.fragmentsPath }.${ fragmentIndex }`, targetIndex );
			}
		} );

		/**
		 * Move a fragment with the actions menu and keep the focus. Vue moves
		 * the node of the fragment to its new place, and the browser takes the
		 * focus away from a node that moves, so give it back to the element
		 * that had it.
		 *
		 * @param {Function} move
		 */
		function keepFocus( move ) {
			const focused = document.activeElement;
			move();
			nextTick( () => {
				if (
					focused && focused !== document.body &&
					focused.isConnected && document.activeElement !== focused
				) {
					focused.focus();
				}
			} );
		}

		// Fragment hashing
		// ================
		// This component is in charge of keeping the fragment hash array updated,
		// regenerating the hashes whenever appropriate, and moving the hashes
		// around whenever fragments are moved.
		// The preview component tree will depend on the hashes to render and
		// refresh its content, but should not ever touch the hash map.
		//
		// * On initializeAbstractWikiContent: hash lists are initialized for each
		//   section Qid. This happens once in read pages, and they are never touched
		//   again.
		// * On AbstractContentFragment change, emits a 'rehash' event after waiting
		//   for inactivity. On receiving 'rehash', this component rebuilds the hash
		//   and updates the array in the store.

		/**
		 * Updates the fragment hash for the fragment placed in the given index
		 * (benjamin-padded). Writes it as the value for sectionHashes[ section ][ index-1 ]
		 *
		 * @param {Object} fragment
		 * @param {number} fragmentIndex
		 */
		async function regenerateHash( fragment, fragmentIndex ) {
			const hashIndex = parseInt( fragmentIndex ) - 1;
			const hashed = await sha256( JSON.stringify( stabilize( fragment ) ) );
			store.setAbstractFragmentHash( props.section.qid, hashIndex, hashed );
		}

		return {
			closeClipboard,
			draggedIndex,
			insertionOffset,
			isDragging,
			listRef,
			startDrag,
			pasteFromClipboard,
			showClipboard,
			addFragment,
			menuItems,
			performAction,
			regenerateHash,
			getListItemKey,
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

	.ext-wikilambda-app-abstract-content-section-fragments {
		position: relative;
	}

	.ext-wikilambda-app-abstract-content-section-insertion {
		position: absolute;
		left: 0;
		width: 100%;
		height: @border-width-thick;
		background-color: @border-color-progressive;
		pointer-events: none;
	}
}
</style>
