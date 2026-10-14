<!--
	WikiLambda Vue component for a list of selectable items in a dialog,
	optionally in groups with a title.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-dialog-item-list">
		<div
			v-for="group in groups"
			:key="group.id"
			class="ext-wikilambda-app-dialog-item-list__group"
		>
			<!-- h3 under the dialog title (h2); it also names the list -->
			<h3
				v-if="group.title"
				:id="getGroupTitleId( group )"
				class="ext-wikilambda-app-dialog-item-list__group-title"
			>
				{{ group.title }}
			</h3>
			<ul
				class="ext-wikilambda-app-list-reset ext-wikilambda-app-dialog-item-list__list"
				:aria-labelledby="group.title ? getGroupTitleId( group ) : undefined"
			>
				<li
					v-for="( item, index ) in group.items"
					:key="getItemKey( group, item, index )"
					class="ext-wikilambda-app-dialog-item-list__item"
				>
					<!--
						Enter selects on keyup, as Codex buttons do: a dialog gives focus back to
						the Codex button that opened it when it closes, so selecting on keydown
						would let the same key's keyup click that button and open the dialog again.
					-->
					<button
						type="button"
						class="ext-wikilambda-app-button-reset
							ext-wikilambda-app-dialog-item-list__button"
						@mousedown="onMouseDown"
						@click="selectItem( item )"
						@keydown.enter.prevent="pressedKey = getItemKey( group, item, index )"
						@keyup.enter="onEnterKeyUp( group, item, index )"
						@blur="pressedKey = null"
					>
						<!--
							Item content: phrasing content only (spans), as it is inside a button.
							Use the __item-title and __item-description classes for the item text.
						-->
						<slot name="item" :item="item"></slot>
					</button>
				</li>
			</ul>
		</div>
	</div>
</template>

<script>
const { defineComponent, onBeforeUnmount, ref, useId } = require( 'vue' );

module.exports = exports = defineComponent( {
	name: 'wl-dialog-item-list',
	props: {
		/**
		 * Groups of items: [ { id, title (optional), items } ]
		 */
		groups: {
			type: Array,
			required: true
		},
		/**
		 * Item property that identifies an item; the index is used if not given
		 */
		itemKey: {
			type: String,
			required: false,
			default: ''
		}
	},
	emits: [ 'select' ],
	setup( props, { emit } ) {
		const idPrefix = `ext-wikilambda-app-dialog-item-list-${ useId() }`;
		// Key of the item that got the Enter keydown
		const pressedKey = ref( null );
		// A closing Codex dialog unmounts its content at once, but keeps it on screen,
		// still clickable, while it fades out. Ignore those clicks and keys.
		let isUnmounted = false;
		onBeforeUnmount( () => {
			isUnmounted = true;
		} );

		/**
		 * Returns the id of the title of the given group.
		 *
		 * @param {Object} group
		 * @return {string}
		 */
		function getGroupTitleId( group ) {
			return `${ idPrefix }-${ group.id }`;
		}

		/**
		 * Returns a key for an item, unique in the list.
		 *
		 * @param {Object} group
		 * @param {Object} item
		 * @param {number} index
		 * @return {string}
		 */
		function getItemKey( group, item, index ) {
			return `${ group.id }-${ props.itemKey ? item[ props.itemKey ] : index }`;
		}

		/**
		 * Emits the selected item, unless the list is closing.
		 *
		 * @param {Object} item
		 */
		function selectItem( item ) {
			pressedKey.value = null;
			if ( isUnmounted ) {
				return;
			}
			emit( 'select', item );
		}

		/**
		 * Selects the item on Enter keyup, only if its keydown was on this item:
		 * a keyup that started elsewhere, e.g. on the button that opened the dialog,
		 * does not select anything.
		 *
		 * @param {Object} group
		 * @param {Object} item
		 * @param {number} index
		 */
		function onEnterKeyUp( group, item, index ) {
			if ( pressedKey.value !== getItemKey( group, item, index ) ) {
				return;
			}
			selectItem( item );
		}

		/**
		 * While the list is closing, keeps the focus where it is: the closing dialog
		 * has already given it back to the button that opened it.
		 *
		 * @param {MouseEvent} event
		 */
		function onMouseDown( event ) {
			if ( isUnmounted ) {
				event.preventDefault();
			}
		}

		return {
			getGroupTitleId,
			getItemKey,
			onEnterKeyUp,
			onMouseDown,
			pressedKey,
			selectItem
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-dialog-item-list {
	.ext-wikilambda-app-dialog-item-list__group-title {
		margin: 0;
		padding: @spacing-50 @spacing-150;
		border: 0;
		color: @color-subtle;
		font-family: inherit;
		font-size: inherit;
		font-weight: @font-weight-bold;
	}

	.ext-wikilambda-app-dialog-item-list__item {
		margin: 0;
		padding: 0;
	}

	.ext-wikilambda-app-dialog-item-list__item-title {
		display: block;
	}

	.ext-wikilambda-app-dialog-item-list__item-description {
		display: block;
		color: @color-subtle;
	}

	.ext-wikilambda-app-dialog-item-list__button {
		display: block;
		width: 100%;
		padding: @spacing-50 @spacing-150;
		text-align: left;

		&:hover {
			background-color: @background-color-interactive-subtle--hover;
		}

		&:active {
			background-color: @background-color-interactive-subtle--active;
		}

		&:focus-visible {
			outline: @border-width-thick @border-style-base @outline-color-progressive--focus;
			outline-offset: -@border-width-thick;
		}
	}
}
</style>
