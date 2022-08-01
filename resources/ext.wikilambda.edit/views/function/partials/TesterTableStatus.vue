<template>
	<!--
		WikiLambda Vue component for the details tab in the ZFunction Viewer.

		@copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<cdx-icon
			:icon="statusIcon"
			:class="statusIconClass"
		></cdx-icon>
		{{ status }}
		<cdx-icon
			:icon="messageIcon"
		></cdx-icon>
	</div>
</template>

<script>
var CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'tester-table-status',
	components: {
		'cdx-icon': CdxIcon
	},
	props: {
		status: {
			type: String,
			required: true
		}
	},
	computed: {
		statusIcon: function () {
			if ( this.status === this.$i18n( 'wikilambda-tester-status-passed' ).text() ) {
				return icons.cdxIconCheck;
			}
			return icons.cdxIconClose;
		},
		statusIconClass: function () {
			if ( this.status === this.$i18n( 'wikilambda-tester-status-passed' ).text() ) {
				return 'ext-wikilambda-tester-table-status--PASS';
			}
			return 'ext-wikilambda-tester-table-status--FAIL';
		},
		messageIcon: function () {
			return icons.cdxIconInfo;
		}
	}
};
</script>

<style lang="less">
@import '../../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-tester-table-status {
	&--PASS {
		color: @wmui-color-green30;
	}

	&--FAIL {
		color: @wmui-color-red30;
	}
}
</style>
