<!--
	WikiLambda Vue component that renders the expanded view toggle icon.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-button
		weight="quiet"
		:aria-label="$i18n( 'wikilambda-toggle-expanded-view' ).text()"
		class="ext-wikilambda-app-expanded-toggle"
		:disabled="!hasExpandedMode"
		data-testid="expanded-toggle"
		@click="waitAndExpand"
	>
		<cdx-icon
			class="ext-wikilambda-app-expanded-toggle__icon"
			:class="iconClass"
			:icon="hasExpandedMode ? icons.cdxIconExpand : iconBullet"
		></cdx-icon>
	</cdx-button>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );
const { CdxButton, CdxIcon } = require( '../../../codex.js' );
const icons = require( '../../../lib/icons.json' );
const useMainStore = require( '../../store/index.js' );

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
	computed: Object.assign( {}, mapState( useMainStore, [
		'waitForRunningParsers'
	] ), {
		iconClass: function () {
			if ( !this.hasExpandedMode ) {
				return 'ext-wikilambda-app-expanded-toggle__icon--disabled';
			} else {
				return this.expanded ?
					'ext-wikilambda-app-expanded-toggle__icon--expanded' :
					'ext-wikilambda-app-expanded-toggle__icon--collapsed';
			}
		}
	} ),
	methods: {
		waitAndExpand: function ( event ) {
			this.waitForRunningParsers.then( () => this.clickExpandToggle( event ) );
		},
		clickExpandToggle: function ( event ) {
			this.$emit( 'toggle-expand', event );
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-expanded-toggle {
	width: calc( @min-size-icon-small + 2px );
	min-width: calc( @min-size-icon-small + 2px );
	padding: 0;

	.ext-wikilambda-app-expanded-toggle__icon {
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

		// Make the bullet icon a bit bigger
		&--disabled.cdx-icon {
			svg {
				width: @spacing-200;
				height: @spacing-200;
			}
		}

		&--collapsed.cdx-icon {
			transform: rotate( -90deg );
		}
	}
}

[ dir='rtl' ] {
	.ext-wikilambda-app-expanded-toggle {
		.ext-wikilambda-app-expanded-toggle__icon--collapsed.cdx-icon {
			transform: rotate( 90deg );
		}
	}
}
</style>
