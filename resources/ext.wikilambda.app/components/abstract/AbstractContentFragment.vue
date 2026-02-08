<!--
	WikiLambda Vue component for an Abstract Content fragment.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-abstract-content-fragment"
		:class="{ 'ext-wikilambda-app-abstract-content-fragment__highlight': isHighlighted }"
		@pointerenter="setHighlight"
		@pointerleave="unsetHighlight"
		@focus="setHighlight"
		@blur="unsetHighlight"
	>
		<cdx-menu-button
			v-if="edit"
			class="ext-wikilambda-app-abstract-content-fragment-menu"
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
const { computed, defineComponent, onUnmounted } = require( 'vue' );

const Constants = require( '../../Constants.js' );
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
	emits: [ 'action' ],
	setup( props, { emit } ) {
		const store = useMainStore();

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
				label: 'Move fragments',
				hideLabel: true,
				items: [ {
					label: 'Move fragment before',
					value: Constants.LIST_MENU_OPTIONS.MOVE_BEFORE,
					icon: icons.cdxIconTableMoveRowBefore,
					disabled: isFirst
				}, {
					label: 'Move fragment after',
					value: Constants.LIST_MENU_OPTIONS.MOVE_AFTER,
					icon: icons.cdxIconTableMoveRowAfter,
					disabled: isLast
				} ]
			};
			// add item (before or after)
			const insertActionsGroup = {
				label: 'Insert fragments',
				hideLabel: true,
				items: [ {
					label: 'Insert fragment before',
					value: Constants.LIST_MENU_OPTIONS.ADD_BEFORE,
					icon: icons.cdxIconTableAddRowBefore
				}, {
					label: 'Insert fragment after',
					value: Constants.LIST_MENU_OPTIONS.ADD_AFTER,
					icon: icons.cdxIconTableAddRowAfter
				} ]
			};
			// copy options
			const clipboardActionGroup = {
				label: 'Clipboard',
				hideLabel: true,
				items: [ {
					label: 'Copy to clipboard',
					value: Constants.LIST_MENU_OPTIONS.COPY_CLIPBOARD,
					icon: icons.cdxIconCopy
				}, {
					label: 'Paste from clipboard',
					value: Constants.LIST_MENU_OPTIONS.PASTE_CLIPBOARD,
					icon: icons.cdxIconPaste
				} ]
			};
			// delete item
			const deleteActionGroup = {
				label: 'Delete fragment',
				hideLabel: true,
				items: [ {
					label: 'Delete fragment',
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

		return {
			icon,
			isHighlighted,
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
	transition: background-color @transition-duration-base @transition-timing-function-system;

	&.ext-wikilambda-app-abstract-content-fragment__highlight {
		background-color: @background-color-progressive-subtle--hover;
	}

	.ext-wikilambda-app-abstract-content-fragment-menu__icon {
		transform: rotate( 90deg );
	}

	.ext-wikilambda-app-abstract-content-fragment-menu {
		flex: 0 0 auto;
		margin-right: @spacing-50;
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
