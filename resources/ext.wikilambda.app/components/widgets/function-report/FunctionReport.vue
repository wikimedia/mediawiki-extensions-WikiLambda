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
				<p> {{ $i18n( 'wikilambda-tester-no-results' ).text() }} </p>
			</div>
		</template>
	</wl-widget-base>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const icons = require( '../../../../lib/icons.json' );
const typeMixin = require( '../../../mixins/typeMixin.js' );
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
	mixins: [ typeMixin ],
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
	data: function () {
		return {
			activeImplementationZid: null,
			activeTesterZid: null,
			errorId: Constants.ERROR_IDS.TEST_RESULTS,
			showMetrics: false,
			fetching: false,
			abortController: null
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getCurrentZObjectId',
		'getLabelData',
		'getStoredObject',
		'getZTesterMetadata'
	] ), {
		/**
		 * Returns the items that must be tested. If we are in an implementation page
		 * returns the tester zids. If we are in a tester page, returns the implementation
		 * zids.
		 *
		 * @return {Array}
		 */
		zids: function () {
			return this.isTesterReport ? this.implementations : this.testers;
		},

		/**
		 * Returns whether there are any items to test.
		 *
		 * @return {boolean}
		 */
		hasItems: function () {
			return ( this.functionZid && ( this.zids.length > 0 ) );
		},

		/**
		 * Whether it is a report for an implementation page.
		 *
		 * @return {boolean}
		 */
		isImplementationReport: function () {
			return this.contentType === Constants.Z_IMPLEMENTATION;
		},

		/**
		 * Whether it is a report for a tester page.
		 *
		 * @return {boolean}
		 */
		isTesterReport: function () {
			return this.contentType === Constants.Z_TESTER;
		},

		/**
		 * Returns the selected Implementation zid if we are in an implementation
		 * page; else returns null.
		 *
		 * @return {string|null}
		 */
		implementationZid: function () {
			return this.isImplementationReport ? this.getCurrentZObjectId : null;
		},

		/**
		 * Returns the selected Tester zid if we are in a tester page;
		 * else returns null.
		 *
		 * @return {string|null}
		 */
		testerZid: function () {
			return this.isTesterReport ? this.getCurrentZObjectId : null;
		},

		/**
		 * Returns the list of implementation zids in the persisted
		 * selected function.
		 *
		 * @return {Array}
		 */
		implementations: function () {
			const functionObject = this.getStoredObject( this.functionZid );
			if ( !this.functionZid || !functionObject ) {
				return [];
			}

			if ( this.implementationZid ) {
				return [ this.implementationZid ];
			} else {
				const fetched = functionObject[
					Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_IMPLEMENTATIONS ];
				// Slice off the first item in the canonical form array; this is a string representing the type.
				return Array.isArray( fetched ) ? fetched.slice( 1 ) : [];
			}
		},

		/**
		 * Returns the list of tester zids in the persisted
		 * selected function.
		 *
		 * @return {Array}
		 */
		testers: function () {
			const functionObject = this.getStoredObject( this.functionZid );
			if ( !this.functionZid || !functionObject ) {
				return [];
			}

			if ( this.testerZid ) {
				return [ this.testerZid ];
			} else {
				const fetched = functionObject[
					Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_TESTERS ];
				// Slice off the first item in the canonical form array; this is a string representing the type.
				return Array.isArray( fetched ) ? fetched.slice( 1 ) : [];
			}
		},

		/**
		 * Returns the metadata object for the current open metrics dialog;
		 * else, returns null
		 *
		 * @return {Object|undefined}
		 */
		metadata: function () {
			return ( this.activeTesterZid && this.activeImplementationZid ) ?
				this.getZTesterMetadata(
					this.functionZid,
					this.activeTesterZid,
					this.activeImplementationZid ) :
				undefined;
		},

		/**
		 * Returns the label data of the implementation for the current open metrics dialog
		 *
		 * @return {LabelData|undefined}
		 */
		activeImplementationLabelData: function () {
			return this.activeImplementationZid ?
				this.getLabelData( this.activeImplementationZid ) :
				undefined;
		},

		/**
		 * Returns the icon for the top right corner of the widget,
		 * depending on the running state.
		 *
		 * @return {string}
		 */
		reloadIcon: function () {
			return this.fetching ? icons.cdxIconCancel : icons.cdxIconReload;
		},

		/**
		 * Returns the title of the widget, depending on the page type
		 *
		 * @return {string}
		 */
		title: function () {
			return this.isTesterReport ?
				this.$i18n( 'wikilambda-function-implementation-table-header' ).text() :
				this.$i18n( 'wikilambda-function-test-cases-table-header' ).text();
		},

		/**
		 * Returns the label of the reload button
		 *
		 * @return {string}
		 */
		reloadLabel: function () {
			return this.fetching ?
				this.$i18n( 'wikilambda-tester-status-cancel' ).text() :
				this.$i18n( 'wikilambda-tester-status-run' ).text();
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'fetchZids',
		'getTestResults'
	] ), {
		/**
		 * Sets the target zids and opens the metrics dialog
		 *
		 * @param {Object} keys
		 */
		openMetricsDialog: function ( keys ) {
			this.activeImplementationZid = keys.implementationZid;
			this.activeTesterZid = keys.testerZid;
			this.showMetrics = true;
		},
		/**
		 * Closes the metrics dialog
		 */
		closeMetricsDialog: function () {
			this.activeImplementationZid = null;
			this.activeTesterZid = null;
			this.showMetrics = false;
		},
		/**
		 * Calls the run function API with the required tester and implementation zids.
		 */
		runTesters: function () {
			// If already fetching, cancel the current request
			if ( this.fetching ) {
				this.cancelTesters();
				return;
			}

			// Cancel previous request if any
			if ( this.abortController ) {
				this.abortController.abort();
			}
			this.abortController = new AbortController();

			this.fetching = true;
			this.getTestResults( {
				zFunctionId: this.functionZid,
				zImplementations: this.implementations,
				zTesters: this.testers,
				clearPreviousResults: true,
				signal: this.abortController.signal
			} ).then( () => {
				this.fetching = false;
			} ).catch( ( error ) => {
				if ( error.code === 'abort' ) {
					// Request was cancelled, reset fetching state
					this.fetching = false;
					return;
				}
				// Re-throw other errors
				throw error;
			} );
		},
		/**
		 * Cancels the current test request
		 */
		cancelTesters: function () {
			if ( this.abortController ) {
				this.abortController.abort();
				this.abortController = null;
			}
			this.fetching = false;
		},
		/**
		 * Run the initial call only when we are in a view or edit page
		 * but not when we are in a new implementation or test page
		 */
		runInitialCall: function () {
			if (
				this.getCurrentZObjectId &&
				this.getCurrentZObjectId !== Constants.NEW_ZID_PLACEHOLDER
			) {
				this.runTesters();
			}
		}
	} ),
	watch: {
		implementations: function ( newValue, oldValue ) {
			if ( !arraysAreEqual( oldValue, newValue ) ) {
				this.fetchZids( { zids: this.implementations } );
				// re-run the tests when the user changes the implementation's function Zid,
				// except when creating a new implementation object (then only run on demand)
				if (
					oldValue.length &&
					this.getCurrentZObjectId &&
					this.getCurrentZObjectId !== Constants.NEW_ZID_PLACEHOLDER
				) {
					this.runTesters();
				}
			}
		},
		testers: function ( newValue, oldValue ) {
			if ( !arraysAreEqual( oldValue, newValue ) ) {
				this.fetchZids( { zids: this.testers } );
				// re-run the tests when the user changes the test's function Zid,
				// except when creating a new test object (then only run on demand)
				if (
					oldValue.length &&
					this.getCurrentZObjectId &&
					this.getCurrentZObjectId !== Constants.NEW_ZID_PLACEHOLDER
				) {
					this.runTesters();
				}
			}
		}
	},
	mounted: function () {
		this.fetchZids( { zids: this.implementations.concat( this.testers ) } )
			.then( () => {
				setTimeout( this.runInitialCall, 1000 );
			} );
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
