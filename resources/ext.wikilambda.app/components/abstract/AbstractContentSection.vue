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
		<div
			ref="listRef"
			class="ext-wikilambda-app-abstract-content-section-fragments"
			:class="{ 'ext-wikilambda-app-abstract-content-section-fragments__dragging': isDragging }"
			:style="getListStyle()"
		>
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
					:style="getFragmentStyle( index )"
					:dragging="isDragging"
					:dragged="draggedIndex === index"
					:in-place="isInPlace && draggedIndex === index"
					@action="performAction( $event, index )"
					@rehash="regenerateHash( fragment, index )"
					@dragstart="startDrag( $event, index )"
				></wl-abstract-content-fragment>
			</template>
			<!-- Copy of the dragged fragment in the gap that opens under the line.
			The script fills it, because it is only a picture of the fragment. -->
			<div
				v-if="insertionOffset !== null"
				ref="ghostRef"
				class="ext-wikilambda-app-abstract-content-section-ghost"
				aria-hidden="true"
				:style="{ top: `${ insertionOffset }px` }"
			></div>
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
const { computed, defineComponent, inject, nextTick, ref, watch } = require( 'vue' );

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

// Space in pixels that the gap adds to the height of the ghost: the line
// above the ghost, and a little space under the ghost
const GAP_SPACE = 4;

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

			if ( payload.action === Constants.LIST_MENU_OPTIONS.SHOW_PROVENANCE ) {
				// Selecting the fragment moves its generated text into view, and the
				// popover opens on the generated text (T441583)
				store.setSelectedFragment( itemKeyPath );
				store.setProvenanceFragment( itemKeyPath );
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
		 * Returns the elements of the fragments, in list order.
		 * The list holds no element for the benjamin item, so the first
		 * element belongs to the fragment in position 1. Only the direct
		 * children count, so the copy in the ghost is not a fragment.
		 *
		 * @return {Array<HTMLElement>}
		 */
		function getFragmentElements() {
			if ( !listRef.value ) {
				return [];
			}
			return Array.from( listRef.value.querySelectorAll(
				':scope > .ext-wikilambda-app-abstract-content-section-fragment'
			) );
		}

		/**
		 * Returns the rectangles of the fragments, in list order.
		 *
		 * @return {Array<Object>}
		 */
		function getFragmentRects() {
			return getFragmentElements().map( ( element ) => element.getBoundingClientRect() );
		}

		// Height of the gap that the list opens at the target for the ghost
		const gapHeight = ref( 0 );

		const {
			isDragging,
			draggedIndex,
			isInPlace,
			gapPoint,
			gapShift,
			insertionOffset,
			startDrag
		} = useFragmentDrag( {
			getListRect,
			getFragmentRects,
			getGapHeight: () => gapHeight.value,
			onDrop: ( fragmentIndex, targetIndex ) => {
				moveTo( `${ props.section.fragmentsPath }.${ fragmentIndex }`, targetIndex );
			}
		} );

		/**
		 * Returns the style of a fragment during a drag. The fragments from the
		 * target onwards move down, to open a gap for the ghost.
		 *
		 * @param {number} index
		 * @return {Object|undefined}
		 */
		function getFragmentStyle( index ) {
			if ( gapPoint.value === null || index < gapPoint.value || gapShift.value === 0 ) {
				return undefined;
			}
			return { transform: `translateY( ${ gapShift.value }px )` };
		}

		/**
		 * Returns the style of the list during a drag. A move of the fragments
		 * does not change the height of the list, so the list grows by the gap:
		 * then the last fragments do not cover the content under the list.
		 *
		 * @return {Object|undefined}
		 */
		function getListStyle() {
			if ( gapPoint.value === null || gapShift.value === 0 ) {
				return undefined;
			}
			return { paddingBottom: `${ gapShift.value }px` };
		}

		const ghostRef = ref( null );

		/**
		 * Returns a copy of a fragment element to show in the ghost. The copy
		 * is only a picture: it has no ids, so that no id of the page repeats,
		 * and it shows no actions menu. It has no state class and no style of
		 * the drag either: the old place can be hidden or moved, and the copy
		 * must still show. A copy of a node leaves out the values that the user
		 * typed, so this copies them too. The copy has no field names either: a
		 * checked radio button with the name of the original joins its group,
		 * and the browser then clears the original.
		 *
		 * @param {HTMLElement} element
		 * @return {HTMLElement}
		 */
		function copyFragment( element ) {
			const copy = element.cloneNode( true );
			const stateClasses = Array.from( copy.classList ).filter(
				( name ) => name.startsWith( 'ext-wikilambda-app-abstract-content-fragment__' )
			);
			copy.classList.remove( 'ext-wikilambda-app-abstract-content-section-fragment', ...stateClasses );
			copy.removeAttribute( 'style' );
			copy.removeAttribute( 'aria-current' );
			copy.removeAttribute( 'id' );
			for ( const node of copy.querySelectorAll( '[id]' ) ) {
				node.removeAttribute( 'id' );
			}
			for ( const node of copy.querySelectorAll( '[name]' ) ) {
				node.removeAttribute( 'name' );
			}
			for ( const menu of copy.querySelectorAll( '.ext-wikilambda-app-abstract-content-fragment-menu' ) ) {
				menu.remove();
			}

			const fields = Array.from( element.querySelectorAll( 'input, textarea, select' ) );
			Array.from( copy.querySelectorAll( 'input, textarea, select' ) ).forEach( ( field, position ) => {
				field.value = fields[ position ].value;
			} );
			return copy;
		}

		// Fill the ghost when it appears, with a copy of the dragged fragment,
		// and open a gap of its height. The gap also leaves a little space under
		// the line and under the ghost.
		watch( ghostRef, ( ghost ) => {
			const element = ghost && getFragmentElements()[ draggedIndex.value - 1 ];
			if ( !element ) {
				gapHeight.value = 0;
				return;
			}
			ghost.replaceChildren( copyFragment( element ) );
			gapHeight.value = ghost.offsetHeight + GAP_SPACE;
		}, { flush: 'post' } );

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
			isInPlace,
			getFragmentStyle,
			getListStyle,
			ghostRef,
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

	// During a drag, the pointer moves the fragment: the fragments must not
	// react to it, and the whole list shows the grabbing cursor
	.ext-wikilambda-app-abstract-content-section-fragments__dragging {
		cursor: @cursor-grabbing;

		> .ext-wikilambda-app-abstract-content-section-fragment {
			pointer-events: none;
		}
	}

	// The fragments slide to open the gap, and the ghost and the line follow
	@media ( prefers-reduced-motion: no-preference ) {
		.ext-wikilambda-app-abstract-content-section-fragments__dragging {
			> .ext-wikilambda-app-abstract-content-section-fragment {
				transition: transform @transition-duration-medium @transition-timing-function-system;
			}

			> .ext-wikilambda-app-abstract-content-section-ghost,
			> .ext-wikilambda-app-abstract-content-section-insertion {
				transition: top @transition-duration-medium @transition-timing-function-system;
			}
		}
	}

	// Copy of the dragged fragment, lifted above the list. It sits in the gap
	// under the line, and it starts just after the ring of the line.
	.ext-wikilambda-app-abstract-content-section-ghost {
		position: absolute;
		left: @size-75;
		right: 0;
		margin-top: @border-width-base;
		max-height: @size-800;
		overflow: hidden;
		background-color: @background-color-base;
		border: @border-width-base @border-style-base @border-color-subtle;
		border-radius: @border-radius-base;
		box-shadow: @box-shadow-medium;
		pointer-events: none;
	}

	// Line that shows where the dragged fragment goes, with a ring at its start
	.ext-wikilambda-app-abstract-content-section-insertion {
		position: absolute;
		left: @size-25;
		right: 0;
		height: @border-width-thick;
		border-radius: @border-radius-base;
		background-color: @border-color-progressive;
		transform: translateY( -50% );
		pointer-events: none;

		&::before {
			content: '';
			position: absolute;
			top: calc( ( @border-width-thick - @size-50 ) / 2 );
			left: calc( -1 * @size-25 );
			box-sizing: border-box;
			width: @size-50;
			height: @size-50;
			border: @border-width-thick @border-style-base @border-color-progressive;
			border-radius: @border-radius-circle;
			background-color: @background-color-base;
		}
	}
}
</style>
