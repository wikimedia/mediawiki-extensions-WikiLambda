<!--
	WikiLambda Vue component for the details tab in the ZFunction Viewer.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-tester-table">
		<wl-status-icon
			:status="statusFlag"
			:status-icon="statusIcon"
		></wl-status-icon>
		<span class="ext-wikilambda-app-function-tester-table__status-message">
			{{ statusMessage }}
		</span>
		<!-- Details button to see metadata -->
		<button
			v-if="( hasMetadata || hasApiErrors ) && !isRunning"
			type="button"
			class="ext-wikilambda-app-button-reset ext-wikilambda-app-function-tester-table__info-button"
			:aria-label="detailsButtonLabel"
			@click.stop="handleMessageIconClick"
		>
			<wl-status-icon
				status="info"
			></wl-status-icon>
		</button>
		<!-- Refresh button if pending -->
		<button
			v-if="isPending && !isRunning"
			type="button"
			class="ext-wikilambda-app-button-reset ext-wikilambda-app-function-tester-table__info-button"
			:aria-label="i18n( 'wikilambda-tester-refresh' ).text()"
			@click.stop="refreshTest"
		>
			<wl-status-icon
				status="refresh"
				:status-icon="iconReload"
			></wl-status-icon>
		</button>
		<!-- Metdata dialog -->
		<wl-function-metadata-dialog
			:v-if="hasMetadata"
			:open="showMetadata"
			:header-text="implementationLabelData"
			:metadata="testMetadata"
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
const useTestResults = require( '../../../composables/useTestResults.js' );

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

		// Constants
		const errorId = Constants.ERROR_IDS.TEST_RESULTS;
		const iconReload = icons.cdxIconReload;

		// Test results and status
		/**
		 * Whether the test for this function,
		 * tester and implementation is in flight.
		 *
		 * @return {boolean}
		 */
		const isRunning = computed( () => store.hasFlyingPromise(
			props.zFunctionId,
			props.zTesterId,
			props.zImplementationId
		) );

		// useTestResults composable:
		const {
			testMetadata,
			hasApiErrors,
			hasMetadata,
			isPending,
			statusFlag,
			statusMessage,
			statusIcon
		} = useTestResults( {
			functionZid: computed( () => props.zFunctionId ),
			testerZid: computed( () => props.zTesterId ),
			implementationZid: computed( () => props.zImplementationId ),
			fetching: isRunning,
			icons: {
				passed: icons.cdxIconCheck,
				failed: icons.cdxIconClose,
				pending: icons.cdxIconAlert
			}
		} );

		/**
		 * Refreshes test execution by calling the perform test
		 * api with the exact combination of function, test and
		 * implementation Zids
		 */
		function refreshTest() {
			store.getTestResults( {
				zFunctionId: props.zFunctionId,
				zTesters: [ props.zTesterId ],
				zImplementations: [ props.zImplementationId ],
				clearPreviousResults: true
			} );
		}

		// Metadata dialog
		const showMetadata = ref( false );

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
			hasApiErrors,
			hasMetadata,
			iconReload,
			implementationLabelData,
			isPending,
			isRunning,
			refreshTest,
			showMetadata,
			statusFlag,
			statusIcon,
			statusMessage,
			testMetadata,
			i18n
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
