<template>
	<!--
		WikiLambda Vue component for displaying and triggering the result of a tester against a given implementation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-tester-result">
		<cdx-icon
			:icon="statusIcon"
			:class="statusIconClass"
		></cdx-icon>
		{{ status }}
		<cdx-icon
			:icon="messageIcon"
			class="ext-wikilambda-tester-result-message-icon"
			@click.native="emitTesterKeys"
		></cdx-icon>
	</div>
</template>

<script>
var mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../../lib/icons.json' );
// @vue/component
module.exports = exports = {
	components: {
		'cdx-icon': CdxIcon
	},
	mixins: [ typeUtils ],
	props: {
		zFunctionId: {
			type: String,
			required: true
		},
		zImplementationId: {
			type: String,
			required: true
		},
		zTesterId: {
			type: String,
			required: true
		}
	},
	computed: $.extend( mapGetters( [
		'getZTesterResults'
	] ), {
		testerStatus: function () {
			return this.getZTesterResults( this.zFunctionId, this.zTesterId, this.zImplementationId );
		},
		status: function () {
			if ( !( this.zImplementationId ) || !( this.zTesterId ) ) {
				return this.$i18n( 'wikilambda-tester-status-pending' ).text();
			}
			if ( this.testerStatus === true ) {
				return this.$i18n( 'wikilambda-tester-status-passed' ).text();
			}
			if ( this.testerStatus === false ) {
				return this.$i18n( 'wikilambda-tester-status-failed' ).text();
			}
			return this.$i18n( 'wikilambda-tester-status-running' ).text();
		},
		statusIcon: function () {
			if ( this.testerStatus === true ) {
				return icons.cdxIconCheck;
			}
			if ( this.testerStatus === false ) {
				return icons.cdxIconClose;
			}
			// This will be used both for pending and running statuses
			return icons.cdxIconAlert;
		},
		statusIconClass: function () {
			if ( this.testerStatus === true ) {
				return 'ext-wikilambda-tester-result-status--PASS';
			}
			if ( this.testerStatus === false ) {
				return 'ext-wikilambda-tester-result-status--FAIL';
			}
			return 'ext-wikilambda-tester-result-status--RUNNING';
		},
		messageIcon: function () {
			return icons.cdxIconInfo;
		}
	} ),
	methods: {
		emitTesterKeys: function () {
			this.$emit( 'set-keys', {
				zImplementationId: this.zImplementationId,
				zTesterId: this.zTesterId
			} );
		}
	}
};
</script>

<style lang="less">
@import '../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-tester-result {
	&-message-icon {
		cursor: pointer;
	}

	&-status {
		&--PASS {
			color: @wmui-color-green30;
		}

		&--FAIL {
			color: @wmui-color-red30;
		}

		&--RUNNING {
			color: @wmui-color-yellow50;
		}
	}
}

</style>
