<!--
	WikiLambda Vue base component for Widgets

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-card class="ext-wikilambda-widget-base">
		<template #title>
			<div
				class="ext-wikilambda-widget-base-header"
				:class="`${hasHeaderAction ? 'ext-wikilambda-widget-base-header-with-action' : ''}`"
			>
				<div class="ext-wikilambda-widget-base-header-slot">
					<slot name="header"></slot>
				</div>
				<div v-if="hasHeaderAction" class="ext-wikilambda-widget-base-header-action">
					<slot name="header-action"></slot>
				</div>
			</div>
		</template>
		<template #description>
			<slot name="main"></slot>
		</template>
		<template v-if="hasFooterAction" #supporting-text>
			<div class="ext-wikilambda-widget-base-footer-slot">
				<slot name="footer"></slot>
			</div>
		</template>
	</cdx-card>
</template>

<script>
const CdxCard = require( '@wikimedia/codex' ).CdxCard;

// @vue/component
module.exports = exports = {
	name: 'wl-widget-base',
	components: {
		'cdx-card': CdxCard
	},
	props: {
		hasHeaderAction: {
			type: Boolean,
			default: false
		},
		hasFooterAction: {
			type: Boolean,
			default: false
		}
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-widget-base {
	border-color: @border-color-subtle;
	margin-bottom: @spacing-125;

	.cdx-card__text {
		width: 100%;
	}

	.cdx-card__text__description {
		color: @color-base;
		margin-top: 0;

		.cdx-button {
			.cdx-icon {
				color: @color-base;
			}
		}
	}

	.cdx-card__text__supporting-text {
		color: @color-base;
		margin-top: 0;
	}

	.cdx-select,
	.cdx-select-vue {
		min-width: auto;
		max-width: @size-1600;
		width: 100%;

		&__handle {
			min-width: auto;
		}
	}

	.cdx-lookup {
		min-width: auto;
		max-width: @size-1600;
		width: 100%;
	}

	.cdx-text-input {
		min-width: auto;
		max-width: @size-1600;
		width: 100%;

		&__input {
			min-width: auto;
		}
	}

	.cdx-dialog {
		.cdx-text-input {
			min-width: initial;
			max-width: initial;
			width: initial;

			&__input {
				min-width: initial;
			}
		}
	}
}

.ext-wikilambda-widget-base-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: @spacing-125;

	&.ext-wikilambda-widget-base-header-with-action {
		margin-bottom: @spacing-50;
	}
}

.ext-wikilambda-widget-base-header-slot {
	flex-grow: 1;
	flex-basis: 0;
}

.ext-wikilambda-widget-base-footer-slot {
	margin-top: @spacing-125;
}

.ext-wikilambda-widget-base-header-action {
	display: flex;
	align-items: center;
	margin-right: -@spacing-35;
	margin-top: -@spacing-35;
}
</style>
