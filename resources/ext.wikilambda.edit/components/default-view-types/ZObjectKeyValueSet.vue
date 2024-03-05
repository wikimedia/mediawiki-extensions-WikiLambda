<!--
	WikiLambda Vue component for rendering a set of ZObjectKeyValue
	components, which is the fallback view for types that don't have
	a custom component and for ZObjects that are viewed in expanded mode.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-key-value-set"
		:class="nestingDepthClass"
		data-testid="z-object-key-value-set"
	>
		<wl-z-object-key-value
			v-for="rowIdItem in childRowIds"
			:key="rowIdItem"
			:row-id="rowIdItem"
			:edit="edit"
			@set-type="$emit( 'set-type', $event )"
			@set-value="$emit( 'set-value', $event )"
			@change-event="$emit( 'change-event', $event )"
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
		}
	},
	computed: $.extend( mapGetters( [
		'getZObjectKeyByRowId',
		'getChildrenByParentRowId'
	] ), {
		/**
		 * Returns the css class that identifies the nesting level
		 *
		 * @return {string}
		 */
		nestingDepthClass: function () {
			return `ext-wikilambda-key-level-${ this.depth }`;
		},

		/**
		 * Returns the array of rowIds for the child key-values to
		 * render them with a ZObjectKeyValue component each.
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
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-key-value-set {
	margin-left: -@spacing-25;

	.ext-wikilambda-key-value-row:last-child {
		> .ext-wikilambda-key-value {
			margin-bottom: @spacing-0;
		}
	}
}
</style>
