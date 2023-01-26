<template>
	<!--
		WikiLambda Vue component for items in a ZList.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div
		class="ext-wikilambda-ztyped-list-item"
		:class="containerStyle"
	>
		<div
			v-if="isTerminalItem"
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
		},
		isTerminalItem: {
			type: Boolean,
			default: false
		}
	},
	computed:
	{
		containerStyle: function () {
			return this.isTerminalItem ? 'ext-wikilambda-ztyped-list-item' : 'ext-wikilambda-ztyped-list-item-flex';
		}
	},
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
	margin-bottom: @spacing-25;

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
	}

	&__last-element {
		margin-bottom: @spacing-0;
	}
}
</style>
