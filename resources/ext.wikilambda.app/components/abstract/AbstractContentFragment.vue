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
			'ext-wikilambda-app-abstract-content-fragment__selected': isSelected
		}"
		:aria-current="isSelected ? 'true' : undefined"
		@pointerenter="setHighlight"
		@pointerleave="unsetHighlight"
		@focusin="onFocusIn"
		@focusout="unsetHighlight"
		@click="selectFragment"
	>
		<cdx-menu-button
			v-if="edit"
			:aria-label="i18n( 'wikilambda-abstract-fragment-actions-menu' ).text()"
			class="ext-wikilambda-app-abstract-content-fragment-menu"
			action="default"
			weight="quiet"
			:menu-items="menuItems"
			:selected="null"
			@update:selected="selectAction"
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
		}
	},
	emits: [ 'action', 'rehash' ],
	setup( props, { emit } ) {
		const store = useMainStore();
		const i18n = inject( 'i18n' );

		// Constants
		const icon = icons.cdxIconEllipsis;
		const htmlFragmentType = Constants.Z_HTML_FRAGMENT;

		const fragmentCount = computed( () => store.getParentListCount( props.keyPath.split( '.' ) ) );

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
			// clipboard options
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
			store.setHighlightedFragment( props.keyPath );
		}

		/**
		 * Remove highlight from fragment
		 */
		function unsetHighlight() {
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
			i18n,
			icon,
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
