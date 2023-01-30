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
				:class="truncateClass"
				:icon="icons.cdxIconExpand"
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
	name: 'wl-base-text',
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
		},
		/**
		 * @return {string}
		 */
		truncateClass: function () {
			return this.shortendText ? '' : 'ext-wikilambda-text-toggle-truncate__icon__inverted';
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
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-text-toggle-truncate {
	display: flex;
	align-items: center;
	justify-content: end;
	margin-top: @spacing-100;
	color: @color-base;
	font-weight: @font-weight-bold;

	&__icon {
		margin-left: @spacing-50;

		svg {
			width: @size-100;
			height: @size-100;
		}

		&__inverted {
			transform: rotate( 180deg );
		}
	}
}
</style>
