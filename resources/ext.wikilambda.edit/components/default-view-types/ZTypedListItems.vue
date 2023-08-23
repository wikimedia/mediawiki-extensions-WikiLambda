<!--
	WikiLambda Vue component for a Typed List set of items.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-ztyped-list-items ext-wikilambda-key-value">
		<!-- if expanded, show toggle button -->
		<div
			v-if="expanded"
			class="ext-wikilambda-key-value-pre"
		>
			<wl-expanded-toggle
				class="ext-wikilambda-key-value-pre-button"
				:has-expanded-mode="false"
				:expanded="true"
			></wl-expanded-toggle>
		</div>

		<div class="ext-wikilambda-key-value-main">
			<!-- if expanded, show key label -->
			<div
				v-if="expanded"
				class="ext-wikilambda-key-block"
			>
				<wl-localized-label :label-data="itemsLabel"></wl-localized-label>
			</div>
			<!-- else, simply show list of items -->
			<div class="ext-wikilambda-ztyped-list-items-block ext-wikilambda-value-block">
				<wl-z-object-key-value
					v-for="item in listItemsRowIds"
					ref="listItemElements"
					:key="'list-item-' + item"
					:row-id="item"
					:edit="edit"
					:list-type="listType"
				></wl-z-object-key-value>
			</div>

			<!-- Button to add a new item -->
			<div>
				<cdx-button
					v-if="edit"
					class="ext-wikilambda-ztyped-list-add-button"
					@click="addListItem"
				>
					<cdx-icon :icon="icons.cdxIconAdd"></cdx-icon>
				</cdx-button>
			</div>
		</div>
	</div>
</template>

<script>
var ExpandedToggle = require( '../base/ExpandedToggle.vue' ),
	LocalizedLabel = require( '../base/LocalizedLabel.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	LabelData = require( '../../store/classes/LabelData.js' ),
	icons = require( '../../../lib/icons.json' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-typed-list-items',
	components: {
		'wl-expanded-toggle': ExpandedToggle,
		'wl-localized-label': LocalizedLabel,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		},
		expanded: {
			type: Boolean,
			required: true
		},
		listType: {
			type: String,
			required: true
		}
	},
	data: function () {
		return {
			icons: icons
		};
	},
	computed: $.extend(
		mapGetters( [
			'getUserLangZid',
			'getChildrenByParentRowId'
		] ),
		{
			/**
			 * Gets the set of ids that compose this typed list, including the type itself
			 *
			 * @return {Array}
			 */
			childRowIds: function () {
				return this.getChildrenByParentRowId( this.rowId )
					.map( function ( row ) { return row.id; } );
			},

			/**
			 * Returns the list items without the type (the first item in the list)
			 *
			 * @return {Array} list
			 */
			listItemsRowIds: function () {
				return this.childRowIds.slice( 1 );
			},

			/**
			 * Returns the key label for the list of items.
			 * Since the FE represents typed lists as benjamin arrays, this must be hardcoded
			 *
			 * @return {string}
			 */
			itemsLabel: function () {
				return new LabelData(
					null,
					this.$i18n( 'wikilambda-list-items-label' ).text(),
					this.getUserLangZid
				);
			}
		}
	),
	methods: {
		addListItem: function () {
			this.$emit( 'add-list-item', { value: this.listType, append: true } );
		}
	},
	watch: {
		childRowIds: function ( list, prevList ) {
			// When a new item is added the list,
			// toggle the expansion in the child component
			if ( list.length > prevList.length ) {
				// Wait until the new item is rendered
				this.$nextTick( () => {
					const newItem = this.$refs.listItemElements[
						this.$refs.listItemElements.length - 1
					];
					newItem.toggleExpanded( true );
				} );
			}
		}
	},
	beforeCreate: function () {
		this.$options.components[ 'wl-z-object-key-value' ] = require( './ZObjectKeyValue.vue' );
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-ztyped-list-items {
	.ext-wikilambda-ztyped-list-add-button {
		margin-top: @spacing-75;
		margin-left: -@spacing-75;
	}

	.ext-wikilambda-ztyped-list-items-block {
		margin-left: -@spacing-75;
	}
}
</style>
