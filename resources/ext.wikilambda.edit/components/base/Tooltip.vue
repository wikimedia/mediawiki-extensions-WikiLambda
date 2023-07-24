<!--
	WikiLambda Vue component for a pop-up "tooltip"

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div>
		<div
			class="ext-wikilambda-tooltip_button"
			@click="toggleVisibility"
			@mouseover="isVisible = true"
			@mouseleave="isVisible = false"
		>
			<slot></slot>
		</div>
		<div v-if="isVisible" class="ext-wikilambda-tooltip_content">
			<div v-if="header" class="ext-wikilambda-tooltip_content_header">
				{{ header }}
			</div>
			<div>
				{{ content }}
			</div>
			<div v-if="footer">
				{{ footer }}
			</div>
		</div>
	</div>
</template>

<script>
// @vue/component
module.exports = exports = {
	name: 'wl-tooltip-item',
	// TODO (T301481): smart positioning of tooltip
	props: {
		header: {
			type: String,
			default: '',
			required: false
		},
		content: {
			type: String,
			required: true
		},
		footer: {
			type: String,
			default: '',
			required: false
		}
	},
	data: function () {
		return {
			isVisible: false
		};
	},
	methods: {
		toggleVisibility: function () {
			this.isVisible = !this.isVisible;
		}
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-tooltip {
	&_button {
		background: none;
		border: 0;
	}

	&_content {
		position: absolute;
		width: 200px;
		padding: @spacing-50;
		margin-top: @spacing-25;
		text-align: left;
		background: @background-color-base;
		box-shadow: @box-shadow-drop-small;
		border: solid 1px @border-color-base;
		font-weight: @font-weight-normal;
		z-index: @z-index-overlay;

		&_header {
			font-weight: @font-weight-bold;
			margin-bottom: 5%;
		}
	}

	&_content::after,
	&_content::before {
		bottom: 100%;
		left: 10%;
		border: solid transparent;
		content: '';
		height: 0;
		width: 0;
		position: absolute;
		pointer-events: none;
	}

	&_content::after {
		border-color: rgba( 255, 255, 255, 0 );
		border-bottom-color: @border-color-inverted;
		border-width: 10px;
		margin-left: -10px;
	}

	&_content::before {
		border-color: rgba( 255, 255, 255, 0 );
		border-bottom-color: @border-color-base;
		border-width: 11px;
		margin-left: -11px;
	}
}

</style>
