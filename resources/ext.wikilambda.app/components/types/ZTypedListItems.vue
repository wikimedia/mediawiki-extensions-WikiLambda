<!--
	WikiLambda Vue component for a Typed List set of items.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<!-- if expanded, show toggle button -->
	<wl-key-value-block
		class="ext-wikilambda-app-typed-list-items"
		:has-expanded-mode="false"
		:expanded="expanded"
		:has-pre-column="expanded"
		:edit="edit"
		data-testid="z-typed-list-items">
		<!-- if expanded, show key label -->
		<template v-if="expanded" #key>
			<wl-localized-label
				:label-data="itemsLabel"
				class="ext-wikilambda-app-typed-list-items__localized-label"
			></wl-localized-label>
		</template>
		<!-- else, simply show list of items -->
		<template #value>
			<!-- Show empty state when no items -->
			<div
				v-if="listItemIndexes.length === 0"
				class="ext-wikilambda-app-typed-list-items__empty-state"
			>
				{{ i18n( 'wikilambda-list-empty-state' ).text() }}
			</div>
			<!-- Show list items -->
			<wl-z-object-key-value
				v-for="index in listItemIndexes"
				:key="`list-item-${ index }`"
				class="ext-wikilambda-app-typed-list-items__block"
				:key-path="`${ keyPath }.${ index }`"
				:object-value="objectValue[ index ]"
				:edit="edit"
				:parent-list-item-type="listItemType"
			></wl-z-object-key-value>
		</template>

		<!-- Button to add a new item -->
		<template #footer>
			<div
				v-if="edit"
				class="ext-wikilambda-app-typed-list-items__add-button"
			>
				<cdx-button
					:title="i18n( 'wikilambda-editor-zlist-additem-tooltip' ).text()"
					:aria-label="i18n( 'wikilambda-editor-zlist-additem-tooltip' ).text()"
					data-testid="typed-list-add-item"
					@click="addListItem"
				>
					<cdx-icon :icon="iconAdd"></cdx-icon>
				</cdx-button>
			</div>
		</template>
	</wl-key-value-block>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const icons = require( '../../../lib/icons.json' );
const LabelData = require( '../../store/classes/LabelData.js' );

// Base components
const KeyValueBlock = require( '../base/KeyValueBlock.vue' );
const LocalizedLabel = require( '../base/LocalizedLabel.vue' );
// Codex components
const { CdxButton, CdxIcon } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-typed-list-items',
	components: {
		'wl-localized-label': LocalizedLabel,
		'wl-key-value-block': KeyValueBlock,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: Array,
			required: true
		},
		listItemType: {
			type: [ String, Object ],
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		expanded: {
			type: Boolean,
			required: true
		}
	},
	emits: [ 'add-list-item' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );

		// Constants
		const iconAdd = icons.cdxIconAdd;

		// List items data
		/**
		 * Returns the list item indexes (all excluding zero)
		 *
		 * @return {Array}
		 */
		const listItemIndexes = computed( () => Object.keys( props.objectValue ).slice( 1 ) );

		/**
		 * Returns the key label for the list of items.
		 * Since the FE represents typed lists as benjamin arrays, this must be hardcoded
		 *
		 * @return {LabelData}
		 */
		const itemsLabel = computed( () => LabelData.fromString( i18n( 'wikilambda-list-items-label' ).text() ) );

		// Actions
		/**
		 * Emits add-list-item event
		 */
		function addListItem() {
			emit( 'add-list-item' );
		}

		return {
			addListItem,
			iconAdd,
			itemsLabel,
			listItemIndexes,
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

.ext-wikilambda-app-typed-list-items {
	margin-bottom: 0;

	.ext-wikilambda-app-typed-list-items__add-button {
		margin-left: -@spacing-50;
		margin-top: @spacing-50;
	}

	.ext-wikilambda-app-typed-list-items__block {
		margin-left: -@spacing-25;
	}

	.ext-wikilambda-app-typed-list-items__localized-label {
		line-height: @spacing-200;
	}

	.ext-wikilambda-app-typed-list-items__empty-state {
		color: @color-placeholder;
	}
}
</style>
