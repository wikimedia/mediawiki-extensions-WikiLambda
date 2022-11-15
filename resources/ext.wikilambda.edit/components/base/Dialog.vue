<template>
	<!--
		WikiLambda Vue component for a Dialog

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-dialog">
		<div
			v-clickout="clickToClose"
			role="dialog"
			class="ext-wikilambda-dialog__box"
			:class="[ 'ext-wikilambda-dialog__box--size-' + size, customClass ]">
			<div class="ext-wikilambda-dialog__header">
				<div class="ext-wikilambda-dialog__header__title">
					<slot name="dialog-title"></slot>
				</div>
				<cdx-button
					type="quiet"
					class="ext-wikilambda-dialog__header__close-button"
					@click="$emit( 'exit-dialog' )"
				>
					<cdx-icon :icon="dialogIcon()"></cdx-icon>
				</cdx-button>
			</div>
			<div class="ext-wikilambda-dialog__body">
				<slot></slot>
			</div>
			<div v-if="showActionButtons" class="ext-wikilambda-dialog__action-buttons">
				<cdx-button
					id="cancel-button"
					@click="$emit( 'close-dialog' )"
				>
					{{ cancelButtonText }}
				</cdx-button>
				<cdx-button
					id="primary-button"
					type="primary"
					:action="primaryButtonStyle"
					:disabled="primaryButtonDisabled"
					@click="$emit( 'confirm-dialog' )"
				>
					{{ confirmButtonText }}
				</cdx-button>
			</div>
			<div v-if="legalText" class="ext-wikilambda-dialog__legal-text">
				<hr class="ext-wikilambda-dialog__divider">
				<div v-html="legalText"></div>
			</div>
		</div>
	</div>
</template>

<script>
var CdxIcon = require( '@wikimedia/codex' ).CdxIcon;
var CdxButton = require( '@wikimedia/codex' ).CdxButton;
var icons = require( '../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'base-dialog',
	components: {
		'cdx-icon': CdxIcon,
		'cdx-button': CdxButton
	},
	directives: {
		clickout: {
			beforeMount: function ( el, binding ) {
				el.clickout = {
					stop: function ( e ) {
						e.stopPropagation();
					}
				};

				document.body.addEventListener( 'click', binding.value );
				el.addEventListener( 'click', el.clickout.stop );
			},
			unmounted: function ( el, binding ) {
				document.body.removeEventListener( 'click', binding.value );
				el.removeEventListener( 'click', el.clickout.stop );
			}
		}
	},
	props: {
		cancelButtonText: {
			type: String,
			required: true
		},
		confirmButtonText: {
			type: String,
			required: true
		},
		canClickOutsideToClose: {
			type: Boolean,
			required: true
		},
		showActionButtons: {
			type: Boolean,
			required: true
		},
		legalText: {
			type: String,
			required: false,
			default: ''
		},
		customClass: {
			type: String,
			required: false,
			default: ''
		},
		size: {
			type: String,
			default: 'small'
		},
		primaryButtonDisabled: {
			type: Boolean,

			default: false,
			required: false
		},
		buttonAction: {
			type: String,
			required: false
		}
	},
	computed: {
		primaryButtonStyle: function () {
			return this.buttonAction || 'destructive';
		}
	},
	methods: {
		clickToClose: function () {
			if ( this.canClickOutsideToClose ) {
				this.$emit( 'close-dialog' );
			}
		},
		dialogIcon: function () {
			return icons.cdxIconClose;
		}
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-dialog {
	position: fixed;
	width: 100%;
	height: 100%;
	background: #ffffffbd;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 999;

	&__box {
		background: @wmui-color-base100;
		border: solid 1px @wmui-color-base50;
		border-radius: 2px;
		box-shadow: 0 2px 2px rgba( 0, 0, 0, 0.25 );
		min-width: 300px;
		max-width: 75%;
		max-height: 75%;
		overflow-y: auto;

		&--size {
			&-auto {
				width: auto;
				overflow-x: auto;
			}

			&-small {
				width: 300px;
			}
		}
	}

	&_text {
		padding: 15px;
		display: flex;
	}

	&__header {
		align-items: center;
		display: flex;
		justify-content: space-between;
		padding: 8px 2px 6px 16px;
		position: sticky;
		top: 0;
		background: @wmui-color-base100;

		&__title {
			width: 100%;
		}

		&__close-button {
			display: flex;
			color: #202122;
			justify-content: center;
			align-items: center;
			height: 32px;
			width: 32px;
			background: none;
			border: 0;
		}
	}

	&__body {
		padding: 0 24px 0 24px;
	}

	&__action-buttons {
		button {
			display: block;
			width: 100%;
			height: 32px;
		}
	}

	&__legal-text {
		font-size: 0.85em;
		line-height: 1.6;
		padding: 16px 24px;
		color: @wmui-color-base30;

		hr {
			color: #c8ccd1;
			margin-bottom: 8px;
		}
	}

	&__divider {
		margin-bottom: 12px;
		margin-top: 0;
	}
}
</style>
