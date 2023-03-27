<template>
	<!--
		WikiLambda Vue component for rendering a set of ZObjectKeyValue
		components, which is the fallback view for types that don't have
		a custom component and for ZObjects that are viewed in expanded mode.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div
		class="ext-wikilambda-key-value-set"
		:class="nestingDepthClass"
	>
		<wl-z-object-key-value
			v-for="rowIdItem in childRowIds"
			:key="rowIdItem"
			:row-id="rowIdItem"
			:parent-expected-type="expectedType"
			:parent-key="parentKey"
			:edit="edit"
			:list-type="listType"
			v-bind="$attrs"
		></wl-z-object-key-value>
	</div>
</template>

<script>
var mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-object-key-value-set',
	components: {
		// Leave components as an empty object to add the ZObjectKeyValue later
	},
	inheritAttrs: false,
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
		depth: {
			type: Number,
			required: true
		},
		expectedType: {
			type: String,
			required: true
		},
		// just a pass through to nested ZObjectKeyValue components
		listType: {
			type: String,
			required: false,
			default: null
		}
	},
	computed: $.extend(
		mapGetters( [
			'getZObjectKeyByRowId',
			'getChildrenByParentRowId'
		] ),
		{
			/**
			 * Returns the css class that identifies the nesting level
			 *
			 * @return {string}
			 */
			nestingDepthClass: function () {
				return `ext-wikilambda-key-level-${this.depth}`;
			},

			/**
			 * Returns the array of rowIds for the child key-values to
			 * render them with a ZObjectKeyValue component each.
			 *
			 * @return {Array}
			 */
			childRowIds: function () {
				return this.getChildrenByParentRowId( this.rowId )
					.map( function ( row ) { return row.id; } );
			},

			/**
			 * Returns the parent key of the set of key-values represented
			 * in this component.
			 *
			 * @return {string}
			 */
			parentKey: function () {
				return this.getZObjectKeyByRowId( this.rowId );
			}
		} ),
	beforeCreate: function () {
		// Need to delay require of ZObjectKeyValue to avoid loop
		this.$options.components[ 'wl-z-object-key-value' ] = require( './ZObjectKeyValue.vue' );
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-key-value-set {
	padding-left: 14px;

	&.ext-wikilambda-key-level-1 {
		border-color: @wl-key-value-color-1;
	}

	&.ext-wikilambda-key-level-2 {
		border-color: @wl-key-value-color-2;
	}

	&.ext-wikilambda-key-level-3 {
		border-color: @wl-key-value-color-3;
	}

	&.ext-wikilambda-key-level-4 {
		border-color: @wl-key-value-color-4;
	}

	&.ext-wikilambda-key-level-5 {
		border-color: @wl-key-value-color-5;
	}

	&.ext-wikilambda-key-level-6 {
		border-color: @wl-key-value-color-6;
	}
	border-top: @wl-key-value-border-top-width @wl-key-value-border-top-style;
	border-bottom: @wl-key-value-border-bottom-width @wl-key-value-border-bottom-style;
	border-right: @wl-key-value-border-right-width @wl-key-value-border-right-style;
	border-left: @wl-key-value-border-left-width @wl-key-value-border-left-style;

	&.ext-wikilambda-key-level-0 {
		border: 0;
		margin: 0;
		padding: 0;
	}
}

</style>
