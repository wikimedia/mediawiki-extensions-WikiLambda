<!--
	WikiLambda Vue component for a status icon

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-icon
		class="ext-wikilambda-app-status-icon"
		:size="size"
		:icon="statusIcon"
		:class="statusIconClass"
		data-testid="status-icon"
	></cdx-icon>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { CdxIcon } = require( '@wikimedia/codex' );
const icons = require( '../../../lib/icons.json' );

module.exports = exports = defineComponent( {
	name: 'wl-status-icon',
	components: {
		'cdx-icon': CdxIcon
	},
	props: {
		size: {
			type: String,
			default: 'medium'
		},
		statusIcon: {
			type: [ String, Object ],
			default: icons.cdxIconInfo
		},
		status: {
			type: String,
			required: true
		}
	},
	computed: {
		/**
		 * Returns the class for the icon depending on the status
		 *
		 * @return {string}
		 */
		statusIconClass() {
			return `ext-wikilambda-app-status-icon--${ this.status }`;
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-status-icon.cdx-icon {
	&.ext-wikilambda-app-status-icon--info {
		cursor: pointer;
	}

	&.ext-wikilambda-app-status-icon--ready {
		color: @color-disabled;
	}

	&.ext-wikilambda-app-status-icon--canceled {
		color: @color-subtle;
	}

	&.ext-wikilambda-app-status-icon--passed {
		color: @color-success;
	}

	&.ext-wikilambda-app-status-icon--failed {
		color: @color-error;
	}

	&.ext-wikilambda-app-status-icon--running {
		color: @color-warning;
	}
}
</style>
