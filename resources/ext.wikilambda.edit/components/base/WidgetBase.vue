<!--
	WikiLambda Vue base component for Widgets

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-widget-base">
		<div
			v-if="hasHeaderSlot || hasHeaderAction"
			class="ext-wikilambda-widget-base-header"
			:class="{ 'ext-wikilambda-widget-base-header-with-action': hasHeaderAction }"
		>
			<!-- Header title slot -->
			<div v-if="hasHeaderSlot" class="ext-wikilambda-widget-base-header-title">
				<slot name="header"></slot>
			</div>
			<!-- Header action slot -->
			<div v-if="hasHeaderAction" class="ext-wikilambda-widget-base-header-action">
				<slot name="header-action"></slot>
			</div>
		</div>
		<!-- Main slot -->
		<div class="ext-wikilambda-widget-base-main ext-wikilambda-field-overrides">
			<slot name="main"></slot>
		</div>
		<!-- Footer action slot -->
		<div v-if="hasFooterSlot" class="ext-wikilambda-widget-base-footer">
			<slot name="footer"></slot>
		</div>
	</div>
</template>

<script>

// @vue/component
module.exports = exports = {
	name: 'wl-widget-base',
	computed: {
		hasHeaderSlot() {
			return !!this.$slots.header;
		},
		hasHeaderAction() {
			return !!this.$slots[ 'header-action' ];
		},
		hasFooterSlot() {
			return !!this.$slots.footer;
		}
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-widget-base {
	border: @border-subtle;
	border-radius: @border-radius-base;
	margin-bottom: @spacing-125;
	padding: @spacing-75;

	.ext-wikilambda-widget-base-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: @spacing-125;

		&.ext-wikilambda-widget-base-header-with-action {
			margin-bottom: @spacing-50;
		}

		.ext-wikilambda-widget-base-header-title {
			flex-grow: 1;
			flex-basis: 0;
			color: @color-base;
			font-weight: @font-weight-bold;
			line-height: @line-height-x-small;
			font-size: @font-size-large;
		}

		.ext-wikilambda-widget-base-header-action {
			display: flex;
			align-items: center;
			margin-right: -@spacing-35;
			margin-top: -@spacing-35;
		}
	}
}
</style>
