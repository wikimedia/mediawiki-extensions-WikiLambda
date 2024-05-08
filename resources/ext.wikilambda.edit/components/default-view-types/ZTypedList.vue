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
		<!-- Type of list item -->
		<wl-z-typed-list-type
			v-if="expanded"
			:row-id="itemTypeRowId"
			:edit="edit"
			:list-item-type="listItemType"
			:parent-row-id="rowId"
		></wl-z-typed-list-type>

		<!-- Collection of items -->
		<wl-z-typed-list-items
			:expanded="expanded"
			:row-id="rowId"
			:edit="edit"
			:list-item-type="listItemType"
			@add-list-item="addListItem"
		></wl-z-typed-list-items>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const ZTypedListItems = require( './ZTypedListItems.vue' ),
	ZTypedListType = require( './ZTypedListType.vue' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = exports = defineComponent( {
	name: 'wl-z-typed-list',
	components: {
		'wl-z-typed-list-items': ZTypedListItems,
		'wl-z-typed-list-type': ZTypedListType
	},
	mixins: [ typeUtils ],
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
	computed: Object.assign(
		mapGetters( [
			'getChildrenByParentRowId',
			'getTypedListItemType'
		] ),
		{
			/**
			 * Returns the id for the first item on the list,
			 * which represents the type of the list items
			 *
			 * @return {number}
			 */
			itemTypeRowId: function () {
				const firstItem = this.getChildrenByParentRowId( this.rowId )
					.find( ( item ) => item.key === '0' );
				return firstItem ? firstItem.id : undefined;
			},

			/**
			 * Returns the string representation of the expected
			 * type for the list items
			 *
			 * @return {string}
			 */
			listItemType: function () {
				return this.getTypedListItemType( this.rowId );
			},

			/**
			 * Returns the css class that identifies the nesting level
			 *
			 * @return {string[]}
			 */
			nestingDepthClass: function () {
				if ( this.expanded ) {
					return [
						'ext-wikilambda-default-key-depth',
						'ext-wikilambda-key-value-set',
						`ext-wikilambda-key-level-${ this.depth }`
					];
				}
				return [];
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
		addListItem: function () {
			this.$emit( 'add-list-item', { value: this.listItemType } );
		}
	}
} );
</script>
