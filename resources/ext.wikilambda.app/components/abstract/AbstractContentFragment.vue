<!--
	WikiLambda Vue component for an Abstract Content fragment.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		ref="rootRef"
		class="ext-wikilambda-app-abstract-content-fragment"
		:class="{
			'ext-wikilambda-app-abstract-content-fragment__highlight': isHighlighted,
			'ext-wikilambda-app-abstract-content-fragment__selected': isSelected,
			'ext-wikilambda-app-abstract-content-fragment__dragged': dragged,
			'ext-wikilambda-app-abstract-content-fragment__in-place': inPlace
		}"
		:aria-current="isSelected ? 'true' : undefined"
		@pointerenter="setHighlight"
		@pointerleave="unsetHighlight"
		@focusin="onFocusIn"
		@focusout="unsetHighlight"
		@click="selectFragment"
	>
		<!-- The drag handle needs no accessible name: the actions menu gives the
		same moves to the keyboard, and a second control adds no function -->
		<span
			v-if="edit"
			class="ext-wikilambda-app-abstract-content-fragment-drag"
			aria-hidden="true"
			@pointerdown="$emit( 'dragstart', $event )"
		>
			<cdx-icon :icon="iconDrag" size="small"></cdx-icon>
		</span>
		<cdx-menu-button
			v-if="edit"
			:aria-label="i18n( 'wikilambda-abstract-fragment-actions-menu' ).text()"
			class="ext-wikilambda-app-abstract-content-fragment-menu"
			action="default"
			weight="quiet"
			:menu-items="menuItems"
			:selected="null"
			@update:selected="selectAction"
			@click="checkCallLink"
			@keydown="checkCallLink"
		>
			<cdx-icon
				class="ext-wikilambda-app-abstract-content-fragment-menu__icon"
				:icon="icon"
				size="small"
			></cdx-icon>
		</cdx-menu-button>
		<wl-z-object-key-value
			:key-path="keyPath"
			:object-value="fragment"
			:edit="edit"
			:skip-key="true"
			:skip-indent="true"
			:parent-list-item-type="htmlFragmentType"
			:collapsed="dragging && dragged"
		></wl-z-object-key-value>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onUnmounted, ref, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useFragmentSelection = require( '../../composables/useFragmentSelection.js' );
const useMainStore = require( '../../store/index.js' );
const icons = require( '../../../lib/icons.json' );

// Type components
const ZObjectKeyValue = require( '../types/ZObjectKeyValue.vue' );
// Codex components
const { CdxIcon, CdxMenuButton } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-content-fragment',
	components: {
		'wl-z-object-key-value': ZObjectKeyValue,
		'cdx-icon': CdxIcon,
		'cdx-menu-button': CdxMenuButton
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		fragment: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		/**
		 * Whether the user drags a fragment of this section. The pointer
		 * follows the drag, so it must not highlight a fragment.
		 */
		dragging: {
			type: Boolean,
			default: false
		},
		/**
		 * Whether the user drags this fragment. During the drag, the fragment
		 * shows its collapsed view, so that an expanded fragment is as small
		 * as the others. It opens again after the drag.
		 */
		dragged: {
			type: Boolean,
			default: false
		},
		/**
		 * Whether a drop now leaves this dragged fragment in its place. Then the
		 * ghost takes the place, and the old place does not show.
		 */
		inPlace: {
			type: Boolean,
			default: false
		}
	},
	emits: [ 'action', 'rehash', 'dragstart' ],
	setup( props, { emit } ) {
		const store = useMainStore();
		const i18n = inject( 'i18n' );

		// Constants
		const icon = icons.cdxIconEllipsis;
		const iconDrag = icons.cdxIconDraggable;
		const htmlFragmentType = Constants.Z_HTML_FRAGMENT;

		const fragmentCount = computed( () => store.getParentListCount( props.keyPath.split( '.' ) ) );

		// The menu shows the try option only when there is a link
		const hasCallLink = ref( false );

		/**
		 * Check if there is a link to try the function call on Wikifunctions.
		 * The menu button calls this function when the user opens the menu with
		 * the pointer or the keyboard. To build the link is slow, because it reads
		 * the full function call. Thus the menu does not build it at each edit.
		 */
		function checkCallLink() {
			hasCallLink.value = !!store.getFunctionCallLink( props.keyPath );
		}

		const key = computed( () => {
			const parts = props.keyPath.split( '.' );
			return parts[ parts.length - 1 ];
		} );

		const menuItems = computed( () => {
			const isFirst = key.value === '1';
			const isLast = key.value === String( fragmentCount.value );
			// move item (before or after)
			const moveActionsGroup = {
				label: i18n( 'wikilambda-abstract-menu-group-move-fragments' ).text(),
				hideLabel: true,
				items: [ {
					label: i18n( 'wikilambda-abstract-menu-option-move-before' ).text(),
					value: Constants.LIST_MENU_OPTIONS.MOVE_BEFORE,
					icon: icons.cdxIconTableMoveRowBefore,
					disabled: isFirst
				}, {
					label: i18n( 'wikilambda-abstract-menu-option-move-after' ).text(),
					value: Constants.LIST_MENU_OPTIONS.MOVE_AFTER,
					icon: icons.cdxIconTableMoveRowAfter,
					disabled: isLast
				} ]
			};
			// add item (before or after)
			const insertActionsGroup = {
				label: i18n( 'wikilambda-abstract-menu-group-insert-fragments' ).text(),
				hideLabel: true,
				items: [ {
					label: i18n( 'wikilambda-abstract-menu-option-insert-before' ).text(),
					value: Constants.LIST_MENU_OPTIONS.ADD_BEFORE,
					icon: icons.cdxIconTableAddRowBefore
				}, {
					label: i18n( 'wikilambda-abstract-menu-option-insert-after' ).text(),
					value: Constants.LIST_MENU_OPTIONS.ADD_AFTER,
					icon: icons.cdxIconTableAddRowAfter
				} ]
			};
			// clipboard options, and try the function call on Wikifunctions
			// when there is a link
			const clipboardActionGroup = {
				label: i18n( 'wikilambda-clipboard-menu-group' ).text(),
				hideLabel: true,
				items: [ {
					label: i18n( 'wikilambda-clipboard-menu-option-copy' ).text(),
					value: Constants.LIST_MENU_OPTIONS.COPY_CLIPBOARD,
					icon: icons.cdxIconCopy
				}, {
					label: i18n( 'wikilambda-clipboard-menu-option-paste' ).text(),
					value: Constants.LIST_MENU_OPTIONS.PASTE_CLIPBOARD,
					icon: icons.cdxIconPaste
				}, ...( hasCallLink.value ? [ {
					label: i18n( 'wikilambda-abstract-menu-option-try-function-call' ).text(),
					value: Constants.LIST_MENU_OPTIONS.TRY_FUNCTION_CALL,
					icon: icons.cdxIconLinkExternal
				} ] : [] ) ]
			};
			// show provenance of the generated text (T441583)
			const provenanceActionGroup = {
				label: i18n( 'wikilambda-abstract-menu-option-show-provenance' ).text(),
				hideLabel: true,
				items: [ {
					label: i18n( 'wikilambda-abstract-menu-option-show-provenance' ).text(),
					value: Constants.LIST_MENU_OPTIONS.SHOW_PROVENANCE,
					icon: icons.cdxIconHistory
				} ]
			};
			// delete item
			const deleteActionGroup = {
				label: i18n( 'wikilambda-abstract-menu-option-delete-fragment' ).text(),
				hideLabel: true,
				items: [ {
					label: i18n( 'wikilambda-abstract-menu-option-delete-fragment' ).text(),
					value: Constants.LIST_MENU_OPTIONS.DELETE_ITEM,
					icon: icons.cdxIconTrash,
					action: 'destructive'
				} ]
			};
			return [
				moveActionsGroup,
				insertActionsGroup,
				clipboardActionGroup,
				provenanceActionGroup,
				deleteActionGroup
			];
		} );

		/**
		 * Emit the event that corresponds to the selected action
		 *
		 * @param {string} action
		 */
		function selectAction( action ) {
			emit( 'action', { action } );
		}

		// Fragment highlighting
		// =====================

		// Highlight state for fragment and preview
		const isHighlighted = computed( () => store.getHighlightedFragment === props.keyPath );

		/**
		 * Add highlight to fragment
		 */
		function setHighlight() {
			if ( props.dragging ) {
				return;
			}
			store.setHighlightedFragment( props.keyPath );
		}

		/**
		 * Remove highlight from fragment
		 */
		function unsetHighlight() {
			if ( props.dragging ) {
				return;
			}
			store.setHighlightedFragment( undefined );
		}

		onUnmounted( () => {
			unsetHighlight();
		} );

		// Fragment selection
		// ==================

		const rootRef = ref( null );
		const { isSelected, selectFragment } = useFragmentSelection(
			() => props.keyPath,
			rootRef
		);

		/**
		 * Highlight the fragment and select it when the keyboard moves the
		 * focus into it, so that the generated text follows the focus.
		 */
		function onFocusIn() {
			setHighlight();
			selectFragment();
		}

		// Fragment hashing
		// ================

		let debounceTimer = null;
		const DEBOUNCE_FRAGMENT_REFRESH_TIMEOUT = 2000;

		// Watch the input fragment call and trigger 'rehash' to request
		// the regeneration of the fragment hash when the content changes.
		// Options:
		// * deep=true to capture changes in depth,
		// * immediate=false to skip trigger on initialization
		watch(
			/* source */ () => props.fragment,
			/* callback */ () => {
				clearTimeout( debounceTimer );
				debounceTimer = setTimeout( () => {
					emit( 'rehash' );
				}, DEBOUNCE_FRAGMENT_REFRESH_TIMEOUT );
			},
			/* options */ { deep: true, immediate: false }
		);

		return {
			checkCallLink,
			i18n,
			icon,
			iconDrag,
			isHighlighted,
			isSelected,
			onFocusIn,
			rootRef,
			selectFragment,
			setHighlight,
			unsetHighlight,
			htmlFragmentType,
			menuItems,
			selectAction
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-content-fragment {
	display: flex;
	align-items: flex-start;
	width: 100%;
	transition-property: background-color, box-shadow;
	transition-duration: @transition-duration-medium;
	transition-timing-function: @transition-timing-function-system;

	&.ext-wikilambda-app-abstract-content-fragment__highlight {
		// TODO (T417770): Use the correct background color for the highlight layer from the design system
		// These values come from the overlay that Visual Editor uses and is hardcoded in their codebase
		background-color: rgba( 109, 169, 247, 0.15 ); // #6da9f7
		box-shadow: inset 0 0 0 1px rgba( 76, 118, 172, 0.15 ); // #4c76ac
	}

	// The selection stays after the pointer goes away, and it can be visible
	// at the same time as the pointer highlight. It must look different, so
	// use a marker on the start edge.
	&.ext-wikilambda-app-abstract-content-fragment__selected {
		background-color: @background-color-progressive-subtle;
		box-shadow: inset 2px 0 0 0 @border-color-progressive;
	}

	// The old position of a dragged fragment: dimmed, with a dashed outline.
	// An outline does not change the layout of the list during the drag.
	&.ext-wikilambda-app-abstract-content-fragment__dragged {
		background-color: transparent;
		box-shadow: none;
		outline: @border-width-base dashed @border-color-base;
		outline-offset: calc( -1 * @border-width-base );
		border-radius: @border-radius-base;
		opacity: @opacity-medium;
	}

	// The ghost takes the old place, but the place keeps its room
	&.ext-wikilambda-app-abstract-content-fragment__in-place {
		visibility: hidden;
	}

	// The handle is on the first row, in line with the actions menu. Then the
	// pointer takes hold of the row that stays when the fragment collapses.
	.ext-wikilambda-app-abstract-content-fragment-drag {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		// The handle is a little wider than its icon. Center the icon, so that
		// it keeps some space from the selection marker on the start edge.
		justify-content: center;
		align-self: flex-start;
		min-height: @min-size-interactive-pointer;
		width: calc( @min-size-icon-small + 4px );
		color: @color-subtle;
		cursor: @cursor-grab;
		// The pointer must drag the fragment, not scroll the page
		touch-action: none;

		&:hover {
			color: @color-base;
		}
	}

	.ext-wikilambda-app-abstract-content-fragment-menu__icon {
		transform: rotate( 90deg );
	}

	.ext-wikilambda-app-abstract-content-fragment-menu {
		flex: 0 0 auto;
	}

	.ext-wikilambda-app-abstract-content-fragment-menu > .cdx-toggle-button {
		margin: 0 auto;
		width: calc( @min-size-icon-small + 4px );
		min-width: calc( @min-size-icon-small + 4px );
		color: @color-subtle;
	}

	.ext-wikilambda-app-abstract-content-fragment-content {
		flex: 1 1 auto;
		min-width: 0;
	}
}
</style>
