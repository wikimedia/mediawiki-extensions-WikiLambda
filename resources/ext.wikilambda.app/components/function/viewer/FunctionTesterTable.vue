<!--
	WikiLambda Vue component for the details tab in the ZFunction Viewer.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-tester-table">
		<wl-status-icon
			:status="status"
			:status-icon="statusIcon"
		></wl-status-icon>
		<span class="ext-wikilambda-app-function-tester-table__status-message">
			{{ statusMessage }}
		</span>
		<wl-status-icon
			v-if="testerStatus !== undefined"
			status="info"
			@click.stop="handleMessageIconClick"
		></wl-status-icon>
		<wl-function-metadata-dialog
			:open="showMetadata"
			:header-text="implementationLabelData"
			:metadata="metadata"
			:error-id="errorId"
			@close-dialog="showMetadata = false"
		></wl-function-metadata-dialog>
	</div>
</template>

<script>

const { defineComponent } = require( 'vue' );
const FunctionMetadataDialog = require( '../../widgets/function-evaluator/FunctionMetadataDialog.vue' ),
	Constants = require( '../../../Constants.js' ),
	useMainStore = require( '../../../store/index.js' ),
	StatusIcon = require( '../../base/StatusIcon.vue' ),
	icons = require( '../../../../lib/icons.json' ),
	{ mapState } = require( 'pinia' );

module.exports = exports = defineComponent( {
	name: 'wl-function-tester-table',
	components: {
		'wl-function-metadata-dialog': FunctionMetadataDialog,
		'wl-status-icon': StatusIcon
	},
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
	data: function () {
		return {
			showMetadata: false,
			errorId: Constants.errorIds.TEST_RESULTS
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getZTesterResults',
		'getZTesterMetadata',
		'getLabelData'
	] ), {
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
			if ( !( this.zImplementationId ) || !( this.zTesterId ) ) {
				return Constants.testerStatus.READY;
			}
			if ( this.testerStatus === true ) {
				return Constants.testerStatus.PASSED;
			}
			if ( this.testerStatus === false ) {
				return Constants.testerStatus.FAILED;
			}
			return Constants.testerStatus.RUNNING;
		},
		/**
		 * Returns the status message
		 *
		 * @return {string}
		 */
		statusMessage: function () {
			switch ( this.status ) {
				case Constants.testerStatus.READY:
					return this.$i18n( 'wikilambda-tester-status-ready' ).text();
				case Constants.testerStatus.PASSED:
					return this.$i18n( 'wikilambda-tester-status-passed' ).text();
				case Constants.testerStatus.FAILED:
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
			if ( this.testerStatus === true ) {
				return icons.cdxIconCheck;
			}
			if ( this.testerStatus === false ) {
				return icons.cdxIconClose;
			}
			// This will be used both for ready and running statuses
			return icons.cdxIconAlert;
		},
		/**
		 * Returns the tester metadata if stored, else returns undefined
		 *
		 * @return {Object|undefined}
		 */
		metadata: function () {
			return this.getZTesterMetadata(
				this.zFunctionId,
				this.zTesterId,
				this.zImplementationId
			);
		},
		/**
		 * Returns the LabelData object of the implementation Zid,
		 * if any, else returns undefined.
		 *
		 * @return {LabelData|undefined}
		 */
		implementationLabelData: function () {
			return this.zImplementationId ?
				this.getLabelData( this.zImplementationId ) :
				undefined;
		}
	} ),
	methods: {
		handleMessageIconClick: function () {
			if ( !this.showMetadata ) {
				this.showMetadata = true;
			} else {
				this.showMetadata = false;
			}
		}
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-tester-table {
	display: flex;

	.ext-wikilambda-app-function-tester-table__status-message {
		display: inline-block;
		margin: 0 8px;
	}
}
</style>
