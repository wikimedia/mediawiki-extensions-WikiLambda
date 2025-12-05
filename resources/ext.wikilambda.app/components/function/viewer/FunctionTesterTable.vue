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
		<button
			v-if="testerStatus !== undefined"
			type="button"
			class="ext-wikilambda-app-button-reset ext-wikilambda-app-function-tester-table__info-button"
			:aria-label="detailsButtonLabel"
			@click.stop="handleMessageIconClick"
		>
			<wl-status-icon
				status="info"
			></wl-status-icon>
		</button>
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
const { computed, defineComponent, inject, ref } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const FunctionMetadataDialog = require( '../../widgets/function-evaluator/FunctionMetadataDialog.vue' );
const icons = require( '../../../../lib/icons.json' );
const StatusIcon = require( '../../base/StatusIcon.vue' );
const useMainStore = require( '../../../store/index.js' );

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
	setup( props ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const showMetadata = ref( false );
		const errorId = Constants.ERROR_IDS.TEST_RESULTS;

		/**
		 * Returns whether the tester passed
		 *
		 * @return {boolean}
		 */
		const testerStatus = computed( () => store.getZTesterResult(
			props.zFunctionId,
			props.zTesterId,
			props.zImplementationId
		) );

		/**
		 * Returns the status of the test
		 *
		 * @return {string}
		 */
		const status = computed( () => {
			if ( !( props.zImplementationId ) || !( props.zTesterId ) ) {
				return Constants.TESTER_STATUS.READY;
			}
			if ( testerStatus.value === true ) {
				return Constants.TESTER_STATUS.PASSED;
			}
			if ( testerStatus.value === false ) {
				return Constants.TESTER_STATUS.FAILED;
			}
			return Constants.TESTER_STATUS.RUNNING;
		} );

		/**
		 * Returns the status message
		 *
		 * @return {string}
		 */
		const statusMessage = computed( () => {
			switch ( status.value ) {
				case Constants.TESTER_STATUS.READY:
					return i18n( 'wikilambda-tester-status-ready' ).text();
				case Constants.TESTER_STATUS.PASSED:
					return i18n( 'wikilambda-tester-status-passed' ).text();
				case Constants.TESTER_STATUS.FAILED:
					return i18n( 'wikilambda-tester-status-failed' ).text();
				default:
					return i18n( 'wikilambda-tester-status-running' ).text();
			}
		} );

		/**
		 * Returns the icon depending on the status
		 *
		 * @return {Object}
		 */
		const statusIcon = computed( () => {
			if ( testerStatus.value === true ) {
				return icons.cdxIconCheck;
			}
			if ( testerStatus.value === false ) {
				return icons.cdxIconClose;
			}
			// This will be used both for ready and running statuses
			return icons.cdxIconAlert;
		} );

		/**
		 * Returns the tester metadata if stored, else returns undefined
		 *
		 * @return {Object|undefined}
		 */
		const metadata = computed( () => store.getZTesterMetadata(
			props.zFunctionId,
			props.zTesterId,
			props.zImplementationId
		) );

		/**
		 * Returns the LabelData object of the implementation Zid
		 *
		 * @return {LabelData|undefined}
		 */
		const implementationLabelData = computed( () => props.zImplementationId ?
			store.getLabelData( props.zImplementationId ) :
			undefined );

		/**
		 * Returns the accessible label for the details button
		 *
		 * @return {string}
		 */
		const detailsButtonLabel = computed( () => {
			if ( implementationLabelData.value ) {
				return i18n( 'wikilambda-tester-details-for', implementationLabelData.value.label ).text();
			}
			return i18n( 'wikilambda-tester-details' ).text();
		} );

		/**
		 * Toggles the metadata dialog
		 */
		function handleMessageIconClick() {
			showMetadata.value = !showMetadata.value;
		}

		return {
			detailsButtonLabel,
			errorId,
			handleMessageIconClick,
			implementationLabelData,
			metadata,
			showMetadata,
			status,
			statusIcon,
			statusMessage,
			testerStatus
		};
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

	.ext-wikilambda-app-function-tester-table__info-button {
		display: inline-flex;
		align-items: center;
	}
}
</style>
