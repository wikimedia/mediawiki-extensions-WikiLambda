<!--
	WikiLambda Vue component for the Clipboard Dialog

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<!-- Clipboard dialog -->
	<cdx-dialog
		:open="open"
		class="ext-wikilambda-app-clipboard"
		:title="i18n( 'wikilambda-clipboard-dialog-title' ).text()"
		use-close-button
		@update:open="closeClipboard"
	>
		<template #header>
			<wl-custom-dialog-header @close-dialog="closeClipboard">
				{{ i18n( 'wikilambda-clipboard-dialog-title' ).text() }}
			</wl-custom-dialog-header>
			<div class="ext-wikilambda-app-clipboard__actions">
				<cdx-search-input
					v-model="filterSubstr"
					:placeholder="i18n( 'wikilambda-clipboard-dialog-filter-placeholder' ).text()"
					class="ext-wikilambda-app-clipboard__action-filter"
				></cdx-search-input>
				<cdx-button
					class="ext-wikilambda-app-clipboard__action-clear"
					action="destructive"
					weight="normal"
					:disabled="clipboardItems.length === 0"
					@click="clearClipboard"
				>
					{{ i18n( 'wikilambda-clipboard-dialog-clear-button' ).text() }}
				</cdx-button>
			</div>
		</template>
		<div class="ext-wikilambda-app-clipboard__items">
			<div
				v-if="clipboardItems.length === 0"
				class="ext-wikilambda-app-clipboard__message"
			>
				{{ i18n( 'wikilambda-clipboard-dialog-no-items' ).text() }}
			</div>
			<div
				v-for="( item, index ) in clipboardItems"
				:key="`${ index }-${ item.itemId }`"
				class="ext-wikilambda-app-clipboard__item"
				:class="{ 'ext-wikilambda-app-clipboard__item--disabled': !item.isCompatible }"
				@click="selectClipboardItem( item )"
			>
				<div class="ext-wikilambda-app-clipboard__item-head">
					<em>{{ item.itemId }}</em>
					<span>type:
						<wl-z-object-to-string
							:key-path="item.originKey"
							:object-value="item.resolvingType"
							:edit="false"
						></wl-z-object-to-string>
					</span>
				</div>
				<div class="ext-wikilambda-app-clipboard__item-body">
					<wl-z-object-to-string
						:key-path="item.originKey"
						:object-value="item.value"
						:edit="false"
					></wl-z-object-to-string>
				</div>
			</div>
		</div>
	</cdx-dialog>
</template>

<script>
const { computed, defineComponent, inject, ref } = require( 'vue' );

const useMainStore = require( '../../store/index.js' );
const { isTypeCompatible } = require( '../../utils/typeUtils.js' );

// Type components
const ZObjectToString = require( '../types/ZObjectToString.vue' );
// Base components
const CustomDialogHeader = require( './CustomDialogHeader.vue' );
// Codex components
const { CdxButton, CdxDialog, CdxSearchInput } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-clipboard-dialog',
	components: {
		'cdx-button': CdxButton,
		'cdx-dialog': CdxDialog,
		'cdx-search-input': CdxSearchInput,
		'wl-custom-dialog-header': CustomDialogHeader,
		'wl-z-object-to-string': ZObjectToString
	},
	props: {
		open: {
			type: Boolean,
			required: true,
			default: false
		},
		expectedType: {
			type: [ String, Object ],
			required: true
		}
	},
	emits: [ 'close-dialog', 'paste' ],
	setup( props, { emit } ) {
		const store = useMainStore();
		const i18n = inject( 'i18n' );

		const filterSubstr = ref( '' );

		// Clipboard items:
		//
		// * Maps all clipboard items and adds isCompatible property.
		//   For a less restrictive experience, we compare the type of the key from where
		//   the block was copied, with the type of the key where the block would be copied.
		//   This allows copy-pasting blocks that use mixed type results (e.g. function
		//   calls to If/Z802) when they come from an already type bound key.
		//
		// * Filters clipboard items by excluding those whose type or key label
		//   don't match the input search substring.
		const clipboardItems = computed( () => store.getClipboardItems
			.map( ( item ) => Object.assign(
				{ isCompatible: (
					isTypeCompatible( item.originSlotType, props.expectedType ) ||
					isTypeCompatible( item.objectType, props.expectedType ) ||
					isTypeCompatible( item.resolvingType, props.expectedType )
				) },
				item
			) )
			.filter( ( item ) => matchesFilter( item ) ) );

		/**
		 * Returns whether the input item matches the filtering substring
		 * (case insensitive) according to the following criteria:
		 * * The item object type label contains the substring, or
		 * * the item resolving type label contains the substring, or
		 * * the item origin key type label contains the substring, or
		 * * the origin key label contains the substring
		 *
		 * @param {Object} item
		 * @return {boolean}
		 */
		function matchesFilter( item ) {
			const substr = filterSubstr.value.toLowerCase();

			const objectType = store.getLabelData( item.objectType ).label;
			if ( objectType.toLowerCase().includes( substr ) ) {
				return true;
			}

			const slotType = store.getLabelData( item.originSlotType ).label;
			if ( slotType.toLowerCase().includes( substr ) ) {
				return true;
			}

			const resolvingType = store.getLabelData( item.resolvingType ).label;
			if ( resolvingType.toLowerCase().includes( substr ) ) {
				return true;
			}

			return item.itemId.toLowerCase().includes( substr );
		}

		/**
		 * Emits an event to close the dialog.
		 */
		function closeClipboard() {
			emit( 'close-dialog' );
		}

		/**
		 * Clears the clipboard (and its copy in localStorage)
		 */
		function clearClipboard() {
			store.clearClipboard();
		}

		/**
		 * If the selected item is type-compatible, emits a
		 * paste event so that it can be copied into the selected
		 * slot. Additionally, emits event to close the dialog.
		 *
		 * @param {Object} value
		 */
		function selectClipboardItem( value ) {
			if ( !value.isCompatible ) {
				// Ignore if not compatible
				return;
			}

			emit( 'paste', value );
			emit( 'close-dialog' );
		}

		return {
			clipboardItems,
			clearClipboard,
			closeClipboard,
			filterSubstr,
			selectClipboardItem,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-clipboard {
	.cdx-dialog__body {
		padding: @spacing-50 0;
	}

	.ext-wikilambda-app-clipboard__actions {
		padding: @spacing-100 0 0;
		display: flex;
		gap: @spacing-150;
		justify-content: space-between;
	}

	.ext-wikilambda-app-clipboard__action-filter {
		flex: 2;
	}

	.ext-wikilambda-app-clipboard__action-clear {
		flex: 1;
	}

	.ext-wikilambda-app-clipboard__message {
		padding: @spacing-75 @spacing-150;
		border-top: @border-width-base @border-style-base @border-color-subtle;
	}

	.ext-wikilambda-app-clipboard__item {
		padding: @spacing-75 @spacing-150;
		border-top: @border-width-base @border-style-base @border-color-subtle;

		&:hover {
			cursor: pointer;
			background-color: @background-color-interactive;
		}
	}

	.ext-wikilambda-app-clipboard__item--disabled {
		background-color: @background-color-neutral;
		color: @color-subtle;

		&:hover {
			cursor: initial;
			background-color: @background-color-neutral;
		}
	}

	.ext-wikilambda-app-clipboard__item-head {
		display: flex;
		justify-content: space-between;
		margin-bottom: @spacing-50;
	}
}

</style>
