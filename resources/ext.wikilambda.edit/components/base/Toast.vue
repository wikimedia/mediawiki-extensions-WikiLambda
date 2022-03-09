<template>
	<div
		class="ext-wikilambda-toast"
		:class="getStyleFromIntent( false )"
	>
		<cdx-icon
			v-if="icon"
			:icon="icon"
			:class="getStyleFromIntent( true )"
			@click="$emit( 'toast-close' )"
		>
		</cdx-icon>
		<div class="ext-wikilambda-toast-text" v-html="message"></div>
	</div>
</template>

<script>
var CdxIcon = require( '@wikimedia/codex' ).CdxIcon;

// @vue/component
module.exports = exports = {
	name: 'toast-message',
	components: {
		'cdx-icon': CdxIcon
	},
	props: {
		icon: {
			type: [ String, Object ],
			default: null,
			required: false
		},
		message: {
			type: String,
			default: ''
		},
		intent: {
			validator: function ( value ) {
				return [ 'SUCCESS', 'FAILURE', 'WARNING', 'UNKNOWN' ].indexOf( value ) !== -1;
			},
			type: String,
			default: 'UNKNOWN'
		},
		timeout: {
			type: Number,
			required: false,
			default: 2000
		}
	},
	methods: {
		getStyleFromIntent: function ( isIcon ) {
			var baseClass = 'ext-wikilambda-toast';
			if ( isIcon ) {
				baseClass += '-icon';
			}

			switch ( this.intent ) {
				case 'SUCCESS':
					baseClass += '__success';
					break;
				case 'FAILURE':
					baseClass += '__failure';
					break;
				case 'WARNING':
					baseClass += '__warning';
					break;
				default:
					baseClass += '__unknown';
			}

			return baseClass;
		}
	},
	mounted: function () {
		if ( this.timeout > 0 ) {
			setTimeout( function () {
				this.$emit( 'toast-close' );
			}.bind( this ), this.timeout );
		}
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-toast {
	padding: 4px 6px;
	width: max-content;
	border-radius: 2px;
	display: flex;
	z-index: 5;

	&__success {
		background-color: @wmui-color-green90;
		border: 1px solid @wmui-color-green30;
	}

	&__failure {
		background-color: @wmui-color-red90;
		border: 1px solid @wmui-color-red30;
	}

	&__warning {
		background-color: @wmui-color-yellow90;
		border: 1px solid @wmui-color-yellow30;
	}

	&__unknown {
		background-color: @wmui-color-base90;
		border: 1px solid @wmui-color-base30;
	}

	&-icon {
		&__success {
			color: @wmui-color-green30;
		}

		&__failure {
			color: @wmui-color-red30;
		}

		&__warning {
			color: @wmui-color-yellow30;
		}

		&__unknown {
			color: @wmui-color-base30;
		}
	}

	&-text {
		margin-left: 10px;
	}
}

</style>
