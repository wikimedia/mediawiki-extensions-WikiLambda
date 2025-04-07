<!--
	WikiLambda Vue base component for Widgets

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-widget-base">
		<div
			v-if="hasHeaderSlot || hasHeaderAction"
			class="ext-wikilambda-app-widget-base__header"
			:class="{ 'ext-wikilambda-app-widget-base__header--with-action': hasHeaderAction }"
		>
			<!-- Header title slot -->
			<div
				v-if="hasHeaderSlot"
				class="ext-wikilambda-app-widget-base__header-title">
				<slot name="header"></slot>
			</div>
			<!-- Header action slot -->
			<div v-if="hasHeaderAction" class="ext-wikilambda-app-widget-base__header-action">
				<slot name="header-action"></slot>
			</div>
		</div>
		<!-- Main slot -->
		<div class="ext-wikilambda-app-widget-base__main ext-wikilambda-app-field-overrides">
			<slot name="main"></slot>
		</div>
		<!-- Footer action slot -->
		<div v-if="hasFooterSlot" class="ext-wikilambda-app-widget-base__footer">
			<slot name="footer"></slot>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );

module.exports = exports = defineComponent( {
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
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-widget-base {
	border: @border-subtle;
	border-radius: @border-radius-base;
	margin-bottom: @spacing-125;
	padding: @spacing-75;

	.ext-wikilambda-app-widget-base__header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		margin-bottom: @spacing-125;
		margin-top: -@spacing-25;

		&--with-action {
			margin-bottom: @spacing-50;
		}
	}

	.ext-wikilambda-app-widget-base__header-title {
		flex-grow: 1;
		flex-basis: 0;
		color: @color-base;
		font-weight: @font-weight-bold;
		line-height: @line-height-x-small;
		font-size: @font-size-large;
		margin-top: @spacing-25;
		margin-bottom: @spacing-35;
	}

	.ext-wikilambda-app-widget-base__header-action {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: @spacing-35;
	}
}
</style>
