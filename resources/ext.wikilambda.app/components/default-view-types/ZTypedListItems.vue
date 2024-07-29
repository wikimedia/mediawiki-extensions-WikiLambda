<!--
	WikiLambda Vue component for a Typed List set of items.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-typed-list-items ext-wikilambda-app-key-value">
		<!-- if expanded, show toggle button -->
		<div
			v-if="expanded"
			class="ext-wikilambda-app-key-value__pre"
		>
			<wl-expanded-toggle
				class="ext-wikilambda-app-key-value__pre-button"
				:has-expanded-mode="false"
				:expanded="true"
			></wl-expanded-toggle>
		</div>

		<div class="ext-wikilambda-app-key-value__main">
			<!-- if expanded, show key label -->
			<div
				v-if="expanded"
				:class="listItemsEditClass"
				class="ext-wikilambda-app-typed-list-items__label ext-wikilambda-app-key-value__key"
			>
				<wl-localized-label
					:label-data="itemsLabel"
					class="ext-wikilambda-app-typed-list-items__localized-label"></wl-localized-label>
			</div>
			<!-- else, simply show list of items -->
			<div class="ext-wikilambda-app-typed-list-items__block ext-wikilambda-app-key_value__value">
				<wl-z-object-key-value
					v-for="item in listItemsRowIds"
					:key="'list-item-' + item"
					:row-id="item"
					:edit="edit"
					:list-item-type="listItemType"
				></wl-z-object-key-value>
			</div>

			<!-- Button to add a new item -->
			<div
				v-if="edit"
				class="ext-wikilambda-app-typed-list-items__add-button"
			>
				<cdx-button
					data-testid="typed-list-add-item"
					:title="$i18n( 'wikilambda-editor-zlist-additem-tooltip' ).text()"
					:aria-label="$i18n( 'wikilambda-editor-zlist-additem-tooltip' ).text()"
					@click="addListItem"
				>
					<cdx-icon :icon="icons.cdxIconAdd"></cdx-icon>
				</cdx-button>
			</div>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const ExpandedToggle = require( '../base/ExpandedToggle.vue' ),
	LocalizedLabel = require( '../base/LocalizedLabel.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	LabelData = require( '../../store/classes/LabelData.js' ),
	icons = require( '../../../lib/icons.json' );

module.exports = exports = defineComponent( {
	name: 'wl-z-typed-list-items',
	components: {
		'wl-expanded-toggle': ExpandedToggle,
		'wl-localized-label': LocalizedLabel,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	props: {
		edit: {
			type: Boolean,
			required: true
		},
		expanded: {
			type: Boolean,
			required: true
		},
		listItemType: {
			type: [ String, Object ],
			required: true
		},
		listItemsRowIds: {
			type: Array,
			default() {
				return [];
			}
		}
	},
	data: function () {
		return {
			icons: icons
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
		 * Returns all the conditional class names for the
		 * the list items label
		 *
		 * @return {string}
		 */
		listItemsEditClass: function () {
			return this.edit ?
				'ext-wikilambda-app-key-value__key--edit' :
				'ext-wikilambda-app-key-value__key--view';
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
