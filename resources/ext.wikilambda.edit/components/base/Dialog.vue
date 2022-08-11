<template>
	<!--
		WikiLambda Vue component for a Dialog

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div v-clickout="clickToClose" class="ext-wikilambda-dialog" :class="customClass">
		<div class="ext-wikilambda-dialog_text">
			<div>
				<div class="ext-wikilambda-dialog_title" v-html="title">
				</div>
				<div v-html="description"></div>
			</div>
			<cdx-button
				type="quiet"
				class="ext-wikilambda-dialog_close-button"
				@click="$emit( 'exit-dialog' )"
			>
				<cdx-icon :icon="dialogIcon()"></cdx-icon>
			</cdx-button>
		</div>
		<div v-if="showActionButtons" class="ext-wikilambda-dialog_action-buttons">
			<cdx-button
				@click="$emit( 'close-dialog' )"
			>
				{{ cancelButtonText }}
			</cdx-button>
			<cdx-button
				action="destructive"
				type="primary"
				@click="$emit( 'confirm-dialog' )"
			>
				{{ confirmButtonText }}
			</cdx-button>
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
	compatConfig: { MODE: 3 },
	components: {
		'cdx-icon': CdxIcon,
		'cdx-button': CdxButton
	},
	directives: {
		clickout: {
			bind: function ( el, binding ) {
				el.clickout = {
					stop: function ( e ) {
						e.stopPropagation();
					}
				};

				document.body.addEventListener( 'click', binding.value );
				el.addEventListener( 'click', el.clickout.stop );
			},
			unbind: function ( el, binding ) {
				document.body.removeEventListener( 'click', binding.value );
				el.removeEventListener( 'click', el.clickout.stop );
			}
		}
	},
	props: {
		title: {
			type: String,
			required: true
		},
		description: {
			type: String,
			required: true
		},
		cancelButtonText: {
			type: String,
			required: true
		},
		confirmButtonText: {
			type: String,
			required: true
		},
		shouldClickToClose: {
			type: Boolean,
			required: true
		},
		showActionButtons: {
			type: Boolean,
			required: true
		},
		customClass: {
			type: String,
			required: false,
			default: ''
		}
	},
	methods: {
		clickToClose: function () {
			if ( this.shouldClickToClose ) {
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
	z-index: 999;
	top: calc( 50% - 10px );
	left: calc( 50% - 10px );
	width: 300px;
	margin-left: -150px;
	background: @wmui-color-base100;
	border: solid 1px @wmui-color-base50;
	border-radius: 2px;

	&_text {
		padding: 15px;
		display: flex;
	}

	&_close-button {
		display: flex;
		justify-content: flex-end;
		background: none;
		border: 0;
		width: fit-content;
		height: fit-content;
		margin-left: auto;
	}

	&_title {
		text-align: center;
		font-size: 21;
	}

	&_danger {
		background-color: #d33;
		color: @wmui-color-base100;
	}

	&_action-buttons {
		button {
			display: block;
			width: 100%;
			height: 40px;
		}
	}
}

</style>
