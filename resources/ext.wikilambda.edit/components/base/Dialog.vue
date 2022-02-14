<template>
	<!--
		WikiLambda Vue component for a Dialog

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div v-clickout="clickToClose" class="ext-wikilambda-dialog">
		<div class="ext-wikilambda-dialog_text">
			<div>
				<div class="ext-wikilambda-dialog_title">
					{{ title }}
				</div>
				<div> {{ description }}</div>
			</div>
			<button class="ext-wikilambda-dialog_close-button" @click="$emit( 'exit-dialog' )">
				<sd-icon :icon="dialogIcon()"></sd-icon>
			</button>
		</div>
		<div class="ext-wikilambda-dialog_action-buttons">
			<button
				:class="cancelButton.class"
				@click="$emit( 'close-dialog' )"
			>
				{{ cancelButton.text }}
			</button>
			<button
				:class="confirmButton.style"
				@click="$emit( 'confirm-dialog' )"
			>
				{{ confirmButton.text }}
			</button>
		</div>
	</div>
</template>

<script>
var SdIcon = require( './Icon.vue' );
var icons = require( './../../../lib/icons.js' );

// @vue/component
module.exports = {
	name: 'base-dialog',
	compatConfig: { MODE: 3 },
	components: {
		'sd-icon': SdIcon
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
		/* expected format:
		{
			// the color to use for the button
			class: ext-wikilambda-dialog_ + (danger | '' )
			text: the text for the button
		} */
		cancelButton: {
			type: Object,
			required: true
		},
		confirmButton: {
			type: Object,
			required: true
		},
		shouldClickToClose: {
			type: Boolean,
			required: true
		}
	},
	methods: {
		clickToClose: function () {
			if ( this.shouldClickToClose ) {
				this.$emit( 'close-dialog' );
			}
		},
		dialogIcon: function () {
			return icons.sdIconClose;
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
