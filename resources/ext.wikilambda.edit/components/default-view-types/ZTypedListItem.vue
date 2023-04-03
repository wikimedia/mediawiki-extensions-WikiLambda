<template>
	<!--
		WikiLambda Vue component for items in a ZList.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div
		class="ext-wikilambda-ztyped-list-item"
		:class="containerClass"
	>
		<div
			v-if="isTerminal"
			class="ext-wikilambda-ztyped-list-item-bullet">
		</div>
		<wl-z-object-key-value
			ref="listValue"
			:row-id="rowId"
			:edit="edit"
			:list-type="listType"
		></wl-z-object-key-value>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-typed-list-item',
	components: {
		// Leave components as an empty object to add the ZObjectKeyValue later
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
		listType: {
			type: String,
			required: true
		}
	},
	computed: $.extend(
		mapGetters( [ 'getZObjectTypeByRowId' ] ),
		{
			/**
			 * Whether a given item is terminal, which will determine
			 * whether or not it's preceded by a bullet point
			 *
			 * @param {number} itemRowId
			 * @return {boolean}
			 */
			isTerminal: function () {
				// we cannot assume an item is the same type as the list type
				// because in the case of a Z1 typed list, each element can be different
				const itemType = this.getZObjectTypeByRowId( this.rowId );

				// although the logic is similar to `hasExpandedMode`,
				// that can't be passed down because it needs to check
				// different properties (and it has different rules for edit)
				const isTerminalListItem = (
					itemType === Constants.Z_OBJECT ||
					itemType === Constants.Z_STRING ||
					itemType === Constants.Z_REFERENCE
				);

				return isTerminalListItem && !this.edit;
			},
			/**
			 * Returns the class name of the list item container div
			 *
			 * @return {string}
			 */
			containerClass: function () {
				return this.isTerminal ?
					'ext-wikilambda-ztyped-list-item' :
					'ext-wikilambda-ztyped-list-item-flex';
			}
		}
	),
	methods: {
		// ZTypedList calls this property on a new item added to the list
		// in order to access the child component, ZObjectKeyValue
		// eslint-disable-next-line vue/no-unused-properties
		setExpanded() {
			this.$refs.listValue.toggleExpanded();
		}
	},
	beforeCreate: function () {
		this.$options.components[ 'wl-z-object-key-value' ] = require( './ZObjectKeyValue.vue' );
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-ztyped-list-item {
	width: 100%;

	&-bullet {
		height: @size-25;
		width: @size-25;
		margin-left: @spacing-50;
		background-color: @border-color-base;
		border-radius: 50%;
		display: inline-flex;
		vertical-align: middle;
	}

	&-flex {
		display: flex;
		flex: 1;
	}

	&__last-element {
		margin-bottom: @spacing-0;
	}
}
</style>
