<!--
	WikiLambda Vue component that renders the expanded view toggle icon.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-button
		weight="quiet"
		aria-label="Toggle"
		class="ext-wikilambda-expand-toggle"
		:disabled="!hasExpandedMode"
		@click="clickExpandToggle"
	>
		<cdx-icon
			class="ext-wikilambda-expand-toggle-icon"
			:class="iconClass"
			:icon="hasExpandedMode ? icons.cdxIconExpand : icons.cdxIconNotBright"
		></cdx-icon>
	</cdx-button>
</template>

<script>
var
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	icons = require( '../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
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
			icons: icons
		};
	},
	computed: {
		iconClass: function () {
			if ( !this.hasExpandedMode ) {
				return 'ext-wikilambda-expand-toggle-disabled';
			} else {
				return this.expanded ?
					'ext-wikilambda-expand-toggle-expanded' :
					'ext-wikilambda-expand-toggle-collapsed';
			}
		}
	},
	methods: {
		clickExpandToggle: function ( event ) {
			this.$emit( 'toggle', event );
		}
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-expand-toggle {
	.ext-wikilambda-expand-toggle-icon {
		color: @color-subtle;
		transition: transform @transition-duration-medium @transition-timing-function-system;

		@media ( prefers-reduced-motion ) {
			transition: transform 0ms unset;
		}

		&.cdx-icon {
			color: @color-subtle;
			width: @size-125;
			height: @size-125;

			svg {
				width: @size-75;
				height: @size-75;
			}
		}

		&.ext-wikilambda-expand-toggle-disabled {
			svg {
				width: @size-25;
				height: @size-25;
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
