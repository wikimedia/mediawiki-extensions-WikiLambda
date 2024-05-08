<!--
	WikiLambda Vue component that renders the expanded view toggle icon.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-button
		weight="quiet"
		:aria-label="$i18n( 'wikilambda-toggle-expanded-view' ).text()"
		class="ext-wikilambda-expand-toggle"
		:disabled="!hasExpandedMode"
		@click="waitAndExpand"
	>
		<cdx-icon
			class="ext-wikilambda-expand-toggle-icon"
			:class="iconClass"
			:icon="hasExpandedMode ? icons.cdxIconExpand : iconBullet"
		></cdx-icon>
	</cdx-button>
</template>

<script>
const { defineComponent } = require( 'vue' );
const CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	icons = require( '../../../lib/icons.json' ),
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = exports = defineComponent( {
	name: 'wl-expanded-toggle',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	props: {
		expanded: {
			type: Boolean,
			required: true
		},
		hasExpandedMode: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			icons: icons,
			iconBullet: {
				path: 'M8 8h4v4H8z'
			}
		};
	},
	computed: Object.assign( mapGetters( [
		'waitForRunningParsers'
	] ), {
		iconClass: function () {
			if ( !this.hasExpandedMode ) {
				return 'ext-wikilambda-expand-toggle-disabled';
			} else {
				return this.expanded ?
					'ext-wikilambda-expand-toggle-expanded' :
					'ext-wikilambda-expand-toggle-collapsed';
			}
		}
	} ),
	methods: {
		waitAndExpand: function ( event ) {
			this.waitForRunningParsers.then( () => this.clickExpandToggle( event ) );
		},
		clickExpandToggle: function ( event ) {
			this.$emit( 'toggle', event );
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-expand-toggle {
	width: calc( @min-size-icon-small + 2px );
	min-width: calc( @min-size-icon-small + 2px );
	padding: 0;

	.ext-wikilambda-expand-toggle-icon {
		width: @min-size-icon-small;
		height: @min-size-icon-small;
		min-width: @min-size-icon-small;
		min-height: @min-size-icon-small;
		padding: 0;
		color: @color-subtle;
		transition: transform @transition-duration-medium @transition-timing-function-system;

		@media ( prefers-reduced-motion ) {
			transition: transform 0ms unset;
		}

		&.cdx-icon {
			color: @color-subtle;
			width: @min-size-icon-small;
			height: @min-size-icon-small;

			svg {
				width: @size-75;
				height: @size-75;
			}
		}

		&.ext-wikilambda-expand-toggle-disabled {
			svg {
				width: @spacing-200;
				height: @spacing-200;
			}
		}

		&.ext-wikilambda-expand-toggle-collapsed {
			transform: rotate( -90deg );
		}
	}
}

[ dir='rtl' ] {
	.ext-wikilambda-expand-toggle {
		.ext-wikilambda-expand-toggle-icon {
			&.ext-wikilambda-expand-toggle-collapsed {
				transform: rotate( 90deg );
			}
		}
	}
}
</style>
