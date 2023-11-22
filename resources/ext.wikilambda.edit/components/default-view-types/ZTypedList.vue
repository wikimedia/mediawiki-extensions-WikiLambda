<!--
	WikiLambda Vue component for a Typed List.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-ztyped-list"
		:class="nestingDepthClass"
	>
		<!-- Type of list -->
		<wl-z-typed-list-type
			v-if="expanded"
			:row-id="itemTypeRowId"
			:edit="edit"
			:list-type="itemType"
			:parent-row-id="rowId"
			:list-items-row-ids="listItemsRowIds"
		></wl-z-typed-list-type>

		<!-- Collection of items -->
		<wl-z-typed-list-items
			:expanded="expanded"
			:row-id="rowId"
			:edit="edit"
			:list-type="itemType"
			:parent-row-id="rowId"
			:list-items-row-ids="listItemsRowIds"
			@add-list-item="addListItem"
		></wl-z-typed-list-items>
	</div>
</template>

<script>
var ZTypedListItems = require( './ZTypedListItems.vue' ),
	ZTypedListType = require( './ZTypedListType.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-typed-list',
	components: {
		'wl-z-typed-list-items': ZTypedListItems,
		'wl-z-typed-list-type': ZTypedListType
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
		depth: {
			type: Number,
			required: true
		}
	},
	computed: $.extend(
		mapGetters( [
			'getChildrenByParentRowId',
			'getTypedListItemType'
		] ),
		{
			/**
			 * Gets the set of ids that compose this typed list,
			 * including the type itself
			 *
			 * @return {Array}
			 */
			childRowIds: function () {
				return this.getChildrenByParentRowId( this.rowId )
					.map( function ( row ) {
						return row.id;
					} );
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
			 * Returns the id for the first item on the list,
			 * which represents the type of the list items
			 *
			 * @return {string}
			 */
			itemTypeRowId: function () {
				return this.childRowIds[ 0 ];
			},

			/**
			 * Returns the string representation of the expected
			 * type for the list items
			 *
			 * @return {string}
			 */
			itemType: function () {
				return this.getTypedListItemType( this.rowId );
			},

			/**
			 * Returns the css class that identifies the nesting level
			 *
			 * @return {string}
			 */
			nestingDepthClass: function () {
				if ( this.expanded ) {
					return [
						'ext-wikilambda-default-key-depth',
						'ext-wikilambda-key-value-set',
						`ext-wikilambda-key-level-${ this.depth }`
					];
				}
			},

			/**
			 * Returns the key label for the list of items.
			 * Since the FE represents typed lists as benjamin arrays,
			 * this must be hardcoded
			 *
			 * @return {string}
			 */
			itemsLabel: function () {
				return this.$i18n( 'wikilambda-list-items-label' ).text();
			}
		}
	),
	methods: {
		addListItem: function ( payload ) {
			this.$emit( 'set-type', payload );
		}
	}
};
</script>
