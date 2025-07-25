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
					:title="$i18n( 'wikilambda-editor-zlist-additem-tooltip' ).text()"
					:aria-label="$i18n( 'wikilambda-editor-zlist-additem-tooltip' ).text()"
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
const { defineComponent } = require( 'vue' );

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
	data: function () {
		return {
			iconAdd: icons.cdxIconAdd
		};
	},
	computed: {
		/**
		 * Returns the key label for the list of items.
		 * Since the FE represents typed lists as benjamin arrays, this must be hardcoded
		 *
		 * @return {string}
		 */
		itemsLabel: function () {
			return LabelData.fromString( this.$i18n( 'wikilambda-list-items-label' ).text() );
		},
		/**
		 * Returns the list item indexes (all excluding zero)
		 *
		 * @return {Array}
		 */
		listItemIndexes: function () {
			return Object.keys( this.objectValue ).slice( 1 );
		}
	},
	methods: {
		addListItem: function () {
			this.$emit( 'add-list-item' );
		}
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
		margin-top: @spacing-75;
	}

	.ext-wikilambda-app-typed-list-items__block {
		margin-left: -@spacing-25;
	}

	.ext-wikilambda-app-typed-list-items__localized-label {
		line-height: @spacing-200;
	}
}
</style>
