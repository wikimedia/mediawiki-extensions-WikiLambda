<!--
	WikiLambda Vue componen for function editor block.
	Contains scaffolding around a function editor block.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-editor-field">
		<div class="ext-wikilambda-app-function-editor-field__label">
			<slot name="label"></slot>
			<slot name="tooltip-icon">
				<cdx-icon
					v-if="showTooltip && tooltipIcon"
					v-tooltip:bottom="tooltipMessage"
					class="ext-wikilambda-app-function-editor-field__tooltip-icon"
					:icon="tooltipIcon">
				</cdx-icon>
			</slot>
			<div class="ext-wikilambda-app-function-editor-field__description">
				<slot name="description"></slot>
			</div>
		</div>
		<div class="ext-wikilambda-app-function-editor-field__body">
			<slot name="body"></slot>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { CdxIcon, CdxTooltip } = require( '@wikimedia/codex' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-field',
	components: {
		'cdx-icon': CdxIcon
	},
	directives: {
		tooltip: CdxTooltip
	},
	props: {
		showTooltip: {
			type: Boolean,
			default: false
		},
		tooltipIcon: {
			type: [ String, Object ],
			default: null,
			required: false
		},
		tooltipMessage: {
			type: String,
			default: null
		}
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-editor-field {
	.ext-wikilambda-app-function-editor-field__label {
		width: @wl-field-label-width;
		display: flex;
		flex-direction: column;

		// To style the label element
		& > label {
			line-height: @size-200;
			font-weight: @font-weight-bold;

			@media screen and ( max-width: @max-width-breakpoint-mobile ) {
				line-height: inherit;
				margin-bottom: @spacing-25;
			}

			// To style the (optional) text
			& > span {
				font-weight: @font-weight-normal;
			}
		}
	}

	.ext-wikilambda-app-function-editor-field__description {
		color: @color-subtle;
		font-size: @font-size-small;
		line-height: @line-height-small;
		display: inline-block;

		@media screen and ( max-width: @max-width-breakpoint-mobile ) {
			margin-bottom: @spacing-25;
		}
	}

	.ext-wikilambda-app-function-editor-field__tooltip-icon {
		margin-left: @spacing-50;
		width: @size-100;
		height: @size-100;
	}

	.ext-wikilambda-app-function-editor-field__body {
		width: @wl-field-body-width;

		@media screen and ( max-width: @max-width-breakpoint-mobile ) {
			width: 100%;
		}
	}
}
</style>
