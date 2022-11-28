<template>
	<component :is="as">
		<span v-if="shortendText">{{ shortendText }}</span>
		<slot v-else></slot>
		<span
			v-if="truncate > 0 && fullText.length > truncate"
			class="ext-wikilambda-text-toggle-truncate"
			@click="toggleTruncateText"
		>
			{{ truncateTitle }}
			<cdx-icon
				class="ext-wikilambda-text-toggle-truncate__icon"
				:icon="icons.cdxIconExpand"
				width="15"
			>
			</cdx-icon>
		</span>
	</component>
</template>

<script>
var CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'text-component',
	components: {
		'cdx-icon': CdxIcon
	},
	props: {
		as: {
			validator: function ( value ) {
				return [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'strong', 'div' ].indexOf( value ) !== -1;
			},
			type: String,
			default: 'p'
		},
		truncate: {
			type: Number,
			required: false,
			default: 0
		}
	},
	data: function () {
		return {
			icons: icons,
			shortendText: '',
			fullText: ''
		};
	},
	computed: {
		/**
		 * @return {string}
		 */
		truncateTitle: function () {
			return this.shortendText ? this.$i18n( 'wikilambda-show-more' ).text() : this.$i18n( 'wikilambda-hide-more' ).text();
		}
	},
	methods: {
		toggleTruncateText() {
			this.fullText = this.$slots.default()[ 0 ].children.trim();

			if ( this.truncate === 0 || this.fullText.length < this.truncate ) {
				return;
			}

			// Show all text is shortenedText is not empty
			if ( this.shortendText.length > 0 ) {
				this.shortendText = '';
				return;
			}

			// Show shortenedText if slot is not empty
			if ( this.fullText.length === 0 ) {
				return;
			}

			this.shortendText = this.fullText.slice( 0, this.truncate ) + '...';
		}
	},
	beforeUpdate: function () {
		if ( this.fullText !== this.$slots.default()[ 0 ].children.trim() ) {
			this.toggleTruncateText();
		}
	},
	mounted: function () {
		this.toggleTruncateText();
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-text-toggle-truncate {
	display: flex;
	align-items: center;
	justify-content: end;
	margin-top: 15px;
	color: @wmui-color-base10;
	font-weight: @font-weight-bold;

	&__icon {
		margin-left: 9px;

		svg {
			width: 15px;
			height: 15px;
		}
	}
}
</style>
