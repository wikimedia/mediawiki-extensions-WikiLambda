<template>
	<!--
		WikiLambda Vue component that renders the expanded view toggle icon.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<cdx-icon
		class="ext-wikilambda-expanded"
		:class="expanded ? 'ext-wikilambda-expanded-toggle-on' : 'ext-wikilambda-expanded-toggle-off'"
		:icon="icons.cdxIconExpand"
		icon-label="Expand"
		@click.prevent="$emit( 'toggle', $event )">
	</cdx-icon>
</template>

<script>
var
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'wl-expanded-toggle',
	components: {
		'cdx-icon': CdxIcon
	},
	props: {
		expanded: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			icons: icons
		};
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-expanded {
	transition: transform @transition-duration-medium @transition-timing-function-system;

	@media ( prefers-reduced-motion ) {
		transition: transform 0ms unset;
	}

	&.cdx-icon {
		color: @border-color-interactive;
		width: @size-125;
		height: @size-125;

		svg {
			width: @size-75;
			height: @size-75;
		}
	}

	&.ext-wikilambda-expanded-toggle-off {
		transform: rotate( -90deg );
	}
}

</style>
