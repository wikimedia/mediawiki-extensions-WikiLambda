<!--
	WikiLambda Vue component for displaying a result item of running
	a function's testers against its implementations or a funciton's
	implementations against its testers.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-report-item">
		<div class="ext-wikilambda-app-function-report-item__header">
			<wl-status-icon
				size="small"
				:status="status"
				:status-icon="statusIcon"
			></wl-status-icon>
			<a
				:href="titleLink"
				class="ext-wikilambda-app-function-report-item__title"
				:class="{ 'ext-wikilambda-app-function-report-item__title--no-label': titleLabelData.isUntitled }"
				:lang="titleLabelData.langCode"
				:dir="titleLabelData.langDir"
			>{{ titleLabelData.labelOrUntitled }}</a>
		</div>

		<div class="ext-wikilambda-app-function-report-item__footer">
			<span class="ext-wikilambda-app-function-report-item__footer-status">
				{{ statusMessage }}
			</span>
			<a
				v-if="!isRunning"
				role="button"
				@click="emitTesterKeys"
			>{{ $i18n( 'wikilambda-tester-details' ).text() }}
			</a>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const StatusIcon = require( '../../base/StatusIcon.vue' );
const icons = require( '../../../../lib/icons.json' );
const typeMixin = require( '../../../mixins/typeMixin.js' );
const useMainStore = require( '../../../store/index.js' );
const urlUtils = require( '../../../utils/urlUtils.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-report-item',
	components: {
		'wl-status-icon': StatusIcon
	},
	mixins: [ typeMixin ],
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
		},
		reportType: {
			type: String,
			default: Constants.Z_TESTER
		},
		fetching: {
			type: Boolean,
			default: false
		}
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getUserLangCode',
		'getZTesterResults',
		'getLabelData'
	] ), {
		/**
		 * Returns the label data for the item title
		 *
		 * @return {LabelData}
		 */
		titleLabelData: function () {
			return this.reportType === Constants.Z_TESTER ?
				this.getLabelData( this.zImplementationId ) :
				this.getLabelData( this.zTesterId );
		},
		/**
		 * Returns the link for the reported item
		 *
		 * @return {string}
		 */
		titleLink: function () {
			const zid = this.reportType === Constants.Z_TESTER ? this.zImplementationId : this.zTesterId;
			return urlUtils.generateViewUrl( { langCode: this.getUserLangCode, zid } );
		},
		/**
		 * Returns whether the tester passed
		 *
		 * @return {boolean}
		 */
		testerStatus: function () {
			return this.getZTesterResults(
				this.zFunctionId,
				this.zTesterId,
				this.zImplementationId
			);
		},
		/**
		 * Returns the status of the test
		 *
		 * @return {string}
		 */
		status: function () {
			if ( this.fetching ) {
				return Constants.TESTER_STATUS.RUNNING;
			}
			if ( !( this.zImplementationId ) || !( this.zTesterId ) ) {
				return Constants.TESTER_STATUS.READY;
			}
			if ( this.testerStatus === true ) {
				return Constants.TESTER_STATUS.PASSED;
			}
			if ( this.testerStatus === false ) {
				return Constants.TESTER_STATUS.FAILED;
			}
			return Constants.TESTER_STATUS.READY;
		},
		/**
		 * Returns the status message
		 *
		 * @return {string}
		 */
		statusMessage: function () {
			switch ( this.status ) {
				case Constants.TESTER_STATUS.READY:
					return this.$i18n( 'wikilambda-tester-status-ready' ).text();
				case Constants.TESTER_STATUS.PASSED:
					return this.$i18n( 'wikilambda-tester-status-passed' ).text();
				case Constants.TESTER_STATUS.FAILED:
					return this.$i18n( 'wikilambda-tester-status-failed' ).text();
				default:
					return this.$i18n( 'wikilambda-tester-status-running' ).text();
			}
		},
		/**
		 * Returns the icon depending on the status
		 *
		 * @return {Object}
		 */
		statusIcon: function () {
			if ( this.status === Constants.TESTER_STATUS.PASSED ) {
				return icons.cdxIconSuccess;
			}
			if ( this.status === Constants.TESTER_STATUS.FAILED ) {
				return icons.cdxIconClear;
			}
			// This will be used both for ready and running statuses
			return icons.cdxIconClock;
		},
		/**
		 * Returns whether the tester is currently running
		 *
		 * @return {string}
		 */
		isRunning: function () {
			return this.status === Constants.TESTER_STATUS.RUNNING;
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
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-report-item {
	.ext-wikilambda-app-function-report-item__header {
		display: flex;
		align-items: flex-start;

		.cdx-icon {
			margin-top: @spacing-25;
		}
	}

	/* TODO: update with codex dark link when available */
	.ext-wikilambda-app-function-report-item__title {
		margin-left: @spacing-50;
		margin-right: 0;
		display: block;
		color: @color-base;
		word-break: break-word;

		&:visited {
			color: @color-base;
		}

		&--no-label {
			&:link,
			&:visited {
				color: @color-placeholder;
			}
		}
	}

	.ext-wikilambda-app-function-report-item__footer {
		margin-left: calc( @spacing-100 + @spacing-50 );
	}

	.ext-wikilambda-app-function-report-item__footer-status {
		color: @color-subtle;
		margin-right: @spacing-50;
	}
}
</style>
