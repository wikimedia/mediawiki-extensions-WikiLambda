<!--
	WikiLambda Vue component for displaying the results of running
	a function's testers against its implementations or a funciton's
	implementations against its testers.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-app-function-report-widget" data-testid="function-report-widget">
		<!-- Widget header -->
		<template #header>
			{{ title }}
		</template>
		<template #header-action>
			<cdx-button
				v-if="hasItems"
				weight="quiet"
				:aria-label="reloadLabel"
				@click="runTesters"
			>
				<cdx-icon :icon="reloadIcon"></cdx-icon>
			</cdx-button>
		</template>

		<!-- Widget main -->
		<template #main>
			<div v-if="hasItems">
				<div
					v-for="item in zids"
					:key="item"
					class="ext-wikilambda-app-function-report-widget__items"
				>
					<wl-function-report-item
						class="ext-wikilambda-app-function-report-widget__result"
						:function-zid="functionZid"
						:implementation-zid="isImplementationReport ? implementationZid : item"
						:tester-zid="isTesterReport ? testerZid : item"
						:fetching="fetching"
						:content-type="contentType"
						@set-keys="openMetricsDialog"
					></wl-function-report-item>
				</div>
				<wl-function-metadata-dialog
					:open="showMetrics"
					:header-text="activeImplementationLabelData"
					:metadata="metadata"
					:error-id="errorId"
					@close-dialog="closeMetricsDialog"
				></wl-function-metadata-dialog>
			</div>
			<div v-else>
				<p> {{ i18n( 'wikilambda-tester-no-results' ).text() }} </p>
			</div>
		</template>
	</wl-widget-base>
</template>

<script>
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const icons = require( '../../../../lib/icons.json' );
const { arraysAreEqual } = require( '../../../utils/miscUtils.js' );
const useMainStore = require( '../../../store/index.js' );

// Base components
const WidgetBase = require( '../../base/WidgetBase.vue' );
// Widget components
const FunctionMetadataDialog = require( '../function-evaluator/FunctionMetadataDialog.vue' );
const FunctionReportItem = require( './FunctionReportItem.vue' );
// Codex components
const { CdxButton, CdxIcon } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-report-widget',
	components: {
		'wl-function-report-item': FunctionReportItem,
		'wl-function-metadata-dialog': FunctionMetadataDialog,
		'wl-widget-base': WidgetBase,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	inject: {
		viewmode: { default: false }
	},
	props: {
		functionZid: {
			type: String,
			required: false,
			default: undefined
		},
		contentType: {
			type: String,
			required: true
		}
	},
	setup( props ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		// Reactive data
		const activeImplementationZid = ref( null );
		const activeTesterZid = ref( null );
		const errorId = ref( Constants.ERROR_IDS.TEST_RESULTS );
		const showMetrics = ref( false );
		const fetching = ref( false );
		const abortController = ref( null );

		// Computed properties
		/**
		 * Whether it is a report for an implementation page.
		 *
		 * @return {boolean}
		 */
		const isImplementationReport = computed( () => props.contentType === Constants.Z_IMPLEMENTATION );

		/**
		 * Whether it is a report for a tester page.
		 *
		 * @return {boolean}
		 */
		const isTesterReport = computed( () => props.contentType === Constants.Z_TESTER );

		/**
		 * Returns the selected Implementation zid if we are in an implementation
		 * page; else returns null.
		 *
		 * @return {string|null}
		 */
		const implementationZid = computed( () => isImplementationReport.value ? store.getCurrentZObjectId : null );

		/**
		 * Returns the selected Tester zid if we are in a tester page;
		 * else returns null.
		 *
		 * @return {string|null}
		 */
		const testerZid = computed( () => isTesterReport.value ? store.getCurrentZObjectId : null );

		/**
		 * Returns the list of implementation zids in the persisted
		 * selected function.
		 *
		 * @return {Array}
		 */
		const implementations = computed( () => {
			const functionObject = store.getStoredObject( props.functionZid );
			if ( !props.functionZid || !functionObject ) {
				return [];
			}

			if ( implementationZid.value ) {
				return [ implementationZid.value ];
			} else {
				const fetched = functionObject[
					Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_IMPLEMENTATIONS ];
				// Slice off the first item in the canonical form array; this is a string representing the type.
				return Array.isArray( fetched ) ? fetched.slice( 1 ) : [];
			}
		} );

		/**
		 * Returns the list of tester zids in the persisted
		 * selected function.
		 *
		 * @return {Array}
		 */
		const testers = computed( () => {
			const functionObject = store.getStoredObject( props.functionZid );
			if ( !props.functionZid || !functionObject ) {
				return [];
			}

			if ( testerZid.value ) {
				return [ testerZid.value ];
			} else {
				const fetched = functionObject[
					Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_TESTERS ];
				// Slice off the first item in the canonical form array; this is a string representing the type.
				return Array.isArray( fetched ) ? fetched.slice( 1 ) : [];
			}
		} );

		/**
		 * Returns the items that must be tested. If we are in an implementation page
		 * returns the tester zids. If we are in a tester page, returns the implementation
		 * zids.
		 *
		 * @return {Array}
		 */
		const zids = computed( () => isTesterReport.value ? implementations.value : testers.value );

		/**
		 * Returns whether there are any items to test.
		 *
		 * @return {boolean}
		 */
		const hasItems = computed( () => props.functionZid && zids.value.length > 0 );

		/**
		 * Returns the metadata object for the current open metrics dialog;
		 * else, returns null
		 *
		 * @return {Object|undefined}
		 */
		const metadata = computed( () => (
			activeTesterZid.value && activeImplementationZid.value ?
				store.getZTesterMetadata(
					props.functionZid,
					activeTesterZid.value,
					activeImplementationZid.value ) :
				undefined
		) );

		/**
		 * Returns the label data of the implementation for the current open metrics dialog
		 *
		 * @return {LabelData|undefined}
		 */
		const activeImplementationLabelData = computed( () => (
			activeImplementationZid.value ?
				store.getLabelData( activeImplementationZid.value ) :
				undefined
		) );

		/**
		 * Returns the icon for the top right corner of the widget,
		 * depending on the running state.
		 *
		 * @return {string}
		 */
		const reloadIcon = computed( () => fetching.value ? icons.cdxIconCancel : icons.cdxIconReload );

		/**
		 * Returns the title of the widget, depending on the page type
		 *
		 * @return {string}
		 */
		const title = computed( () => (
			isTesterReport.value ?
				i18n( 'wikilambda-function-implementation-table-header' ).text() :
				i18n( 'wikilambda-function-test-cases-table-header' ).text()
		) );

		/**
		 * Returns the label of the reload button
		 *
		 * @return {string}
		 */
		const reloadLabel = computed( () => (
			fetching.value ?
				i18n( 'wikilambda-tester-status-cancel' ).text() :
				i18n( 'wikilambda-tester-status-run' ).text()
		) );

		// Methods
		/**
		 * Sets the target zids and opens the metrics dialog
		 *
		 * @param {Object} keys
		 */
		const openMetricsDialog = ( keys ) => {
			activeImplementationZid.value = keys.implementationZid;
			activeTesterZid.value = keys.testerZid;
			showMetrics.value = true;
		};

		/**
		 * Closes the metrics dialog
		 */
		const closeMetricsDialog = () => {
			activeImplementationZid.value = null;
			activeTesterZid.value = null;
			showMetrics.value = false;
		};
		/**
		 * Cancels the current test request
		 */
		const cancelTesters = () => {
			if ( abortController.value ) {
				abortController.value.abort();
				abortController.value = null;
			}
			fetching.value = false;
		};

		/**
		 * Calls the run function API with the required tester and implementation zids.
		 */
		const runTesters = () => {
			// If already fetching, cancel the current request
			if ( fetching.value ) {
				cancelTesters();
				return;
			}

			// Cancel previous request if any
			if ( abortController.value ) {
				abortController.value.abort();
			}
			abortController.value = new AbortController();

			fetching.value = true;
			store.getTestResults( {
				zFunctionId: props.functionZid,
				zImplementations: implementations.value,
				zTesters: testers.value,
				clearPreviousResults: true,
				signal: abortController.value.signal
			} ).then( () => {
				fetching.value = false;
			} ).catch( ( error ) => {
				if ( error.code === 'abort' ) {
					// Request was cancelled, reset fetching state
					fetching.value = false;
					return;
				}
				// Re-throw other errors
				throw error;
			} );
		};

		/**
		 * Run the initial call only when we are in a view or edit page
		 * but not when we are in a new implementation or test page
		 */
		const runInitialCall = () => {
			if (
				store.getCurrentZObjectId &&
				store.getCurrentZObjectId !== Constants.NEW_ZID_PLACEHOLDER
			) {
				runTesters();
			}
		};

		// Watch
		watch( implementations, ( newValue, oldValue ) => {
			if ( !arraysAreEqual( oldValue, newValue ) ) {
				store.fetchZids( { zids: implementations.value } );
				// re-run the tests when the user changes the implementation's function Zid,
				// except when creating a new implementation object (then only run on demand)
				if (
					oldValue.length &&
				store.getCurrentZObjectId &&
				store.getCurrentZObjectId !== Constants.NEW_ZID_PLACEHOLDER
				) {
					runTesters();
				}
			}
		} );

		watch( testers, ( newValue, oldValue ) => {
			if ( !arraysAreEqual( oldValue, newValue ) ) {
				store.fetchZids( { zids: testers.value } );
				// re-run the tests when the user changes the test's function Zid,
				// except when creating a new test object (then only run on demand)
				if (
					oldValue.length &&
					store.getCurrentZObjectId &&
					store.getCurrentZObjectId !== Constants.NEW_ZID_PLACEHOLDER
				) {
					runTesters();
				}
			}
		} );

		// Lifecycle
		onMounted( () => {
			store.fetchZids( { zids: implementations.value.concat( testers.value ) } )
				.then( () => {
					setTimeout( runInitialCall, 1000 );
				} );
		} );

		// Return all properties and methods for the template
		return {
			activeImplementationLabelData,
			closeMetricsDialog,
			errorId,
			fetching,
			hasItems,
			implementationZid,
			isImplementationReport,
			isTesterReport,
			metadata,
			openMetricsDialog,
			reloadIcon,
			reloadLabel,
			runTesters,
			showMetrics,
			testerZid,
			title,
			zids,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-report-widget {
	.ext-wikilambda-app-function-report-widget__items {
		margin-bottom: @spacing-50;

		&:last-child {
			margin-bottom: 0;
		}
	}
}
</style>
