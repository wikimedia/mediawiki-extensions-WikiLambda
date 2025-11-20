<!--
	WikiLambda Vue component for the details tab in the ZFunction Viewer.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<main class="ext-wikilambda-app-function-viewer-details">
		<section class="ext-wikilambda-app-function-viewer-details__tables">
			<wl-function-viewer-details-table
				:columns="implementationsColumns"
				:data="implementationsData"
				:title="i18n( 'wikilambda-function-implementation-table-header' ).text()"
				:can-connect="areProposedImplementationsSelected"
				:can-disconnect="areAvailableImplementationsSelected"
				:empty-text="implementationsFetched ?
					i18n( 'wikilambda-implementation-none-found' ).text() : i18n( 'wikilambda-loading' ).text()"
				:is-loading="implementationsLoading"
				:add-link="addImplementationLink"
				data-testid="function-implementations-table"
				@connect="connectCheckedImplementations"
				@disconnect="disconnectCheckedImplementations"
			>
			</wl-function-viewer-details-table>
			<wl-function-viewer-details-table
				:columns="testsColumns"
				:data="testsData"
				:title="i18n( 'wikilambda-function-test-cases-table-header' ).text()"
				:can-connect="areProposedTestersSelected"
				:can-disconnect="areAvailableTestersSelected"
				:empty-text="testsFetched ?
					i18n( 'wikilambda-tester-none-found' ).text() : i18n( 'wikilambda-loading' ).text()"
				:is-loading="testsLoading"
				:add-link="addTestLink"
				data-testid="function-testers-table"
				@connect="connectCheckedTests"
				@disconnect="disconnectCheckedTests"
			></wl-function-viewer-details-table>
		</section>
		<div
			v-if="!!currentToast"
			class="ext-wikilambda-app-toast-message"
		>
			<cdx-message
				:allow-user-dismiss="true"
				:dismiss-button-label="i18n( 'wikilambda-toast-close' ).text()"
				:fade-in="true"
				type="error"
				@user-dismissed="closeToast"
			>
				{{ currentToast }}
			</cdx-message>
		</div>
	</main>
</template>

<script>
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useType = require( '../../../composables/useType.js' );
const useMainStore = require( '../../../store/index.js' );
const urlUtils = require( '../../../utils/urlUtils.js' );

// Function view components
const FunctionViewerDetailsTable = require( './FunctionViewerDetailsTable.vue' );
// Codex components
const { CdxMessage } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-viewer-details',
	components: {
		'wl-function-viewer-details-table': FunctionViewerDetailsTable,
		'cdx-message': CdxMessage
	},
	setup() {
		const i18n = inject( 'i18n' );
		const { isValidZidFormat } = useType();
		const store = useMainStore();

		/* Local state for function implementations */
		const implementationsState = ref( {} );
		const implementationsFetched = ref( false );
		const implementationsLoading = ref( false );

		/* Local state for function tests */
		const testsState = ref( {} );
		const testsFetched = ref( false );
		const testsLoading = ref( false );

		const currentToast = ref( null );

		// Computed properties
		/**
		 * Zids of all implementations for this function
		 *
		 * @return {Array}
		 */
		const allImplementations = computed( () => Object.keys( implementationsState.value ) );

		/**
		 * Whether any of the available implementations are checked
		 *
		 * @return {boolean}
		 */
		const areAnyImplementationsChecked = computed( () => Object.keys( implementationsState.value ).some(
			( zid ) => implementationsState.value[ zid ].checked
		) );

		/**
		 * Whether any of the disconnected implementations are checked
		 *
		 * @return {boolean}
		 */
		const areProposedImplementationsSelected = computed( () => Object.keys( implementationsState.value ).some(
			( zid ) => implementationsState.value[ zid ].checked && !implementationsState.value[ zid ].available
		) );

		/**
		 * Whether any of the connected implementations are checked
		 *
		 * @return {boolean}
		 */
		const areAvailableImplementationsSelected = computed( () => Object.keys( implementationsState.value ).some(
			( zid ) => implementationsState.value[ zid ].checked && implementationsState.value[ zid ].available
		) );

		/**
		 * Returns the link for add new implementation page
		 *
		 * @return {string}
		 */
		const addImplementationLink = computed( () => new mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl( {
			uselang: store.getUserLangCode,
			zid: Constants.Z_IMPLEMENTATION,
			[ Constants.Z_IMPLEMENTATION_FUNCTION ]: store.getCurrentZObjectId
		} ) );

		// Helper methods for table row management
		/**
		 * Returns true if all rows in the given state are checked
		 *
		 * @param {Object} rows
		 * @return {boolean}
		 */
		const areAllRowsChecked = ( rows ) => Object.keys( rows ).every( ( zid ) => rows[ zid ].checked );

		/**
		 * Returns true if some rows in the given state are checked
		 *
		 * @param {Object} rows
		 * @return {boolean}
		 */
		const areSomeRowsChecked = ( rows ) => Object.keys( rows ).some( ( zid ) => rows[ zid ].checked );

		/**
		 * Checks or unchecks all rows in the given state
		 *
		 * @param {Object} rows
		 * @param {boolean} value
		 */
		function checkAllRows( rows, value ) {
			for ( const zid in rows ) {
				rows[ zid ].checked = value;
			}
		}

		/**
		 * Build the columns for the Implementations table
		 *
		 * @return {Object}
		 */
		const implementationsColumns = computed( () => {
			if ( !allImplementations.value.length ) {
				return undefined;
			}
			return [
				{
					id: 'checkbox',
					title: i18n( 'wikilambda-function-implementation-selectall-label' ),
					component: 'cdx-checkbox',
					props: {
						modelValue: areAllRowsChecked( implementationsState.value ),
						indeterminate: areSomeRowsChecked( implementationsState.value ),
						'onUpdate:modelValue': ( value ) => checkAllRows( implementationsState.value, value ),
						hideLabel: true
					},
					class: 'ext-wikilambda-app-function-viewer-details-table__column--checkbox'
				},
				{
					id: 'name',
					title: i18n( 'wikilambda-function-implementation-name-label' )
				},
				{
					id: 'status',
					title: i18n( 'wikilambda-function-implementation-state-label' )
				},
				{
					id: 'language',
					title: i18n( 'wikilambda-function-implementation-language-label' )
				},
				{
					id: 'result',
					title: i18n( 'wikilambda-function-implementation-tests-passed-label' )
				}
			];
		} );

		/**
		 * Build the content rows for the Implementations table
		 *
		 * @return {Array}
		 */
		const implementationsData = computed( () => {
			const tableData = [];
			for ( const zid of allImplementations.value ) {
				// Get implementation name or its zid if unnamed:
				const implementationLabelData = store.getLabelData( zid );

				// Get implementation connected state:
				const isConnected = store.getConnectedImplementations.includes( zid );

				// Get implementation test results:
				const testResults = store.getZTesterPercentage( zid );

				// Get implementation type and language:
				const type = store.getTypeOfImplementation( zid );
				let language;
				switch ( type ) {
					case Constants.Z_IMPLEMENTATION_COMPOSITION:
						language = i18n( 'wikilambda-implementation-selector-composition' ).text();
						break;
					case Constants.Z_IMPLEMENTATION_BUILT_IN:
						language = i18n( 'wikilambda-implementation-selector-built-in' ).text();
						break;
					default:
						language = store.getLanguageOfImplementation( zid );
						if ( isValidZidFormat( language ) ) {
							store.fetchZids( { zids: [ language ] } );
							language = store.getLabelData( language ).label;
						}
				}

				// Build the table data for the implementations table
				tableData.push( {
					// Column 1: checkbox
					checkbox: {
						title: i18n( 'wikilambda-function-implementation-select-label' ),
						component: 'cdx-checkbox',
						props: {
							modelValue: implementationsState.value[ zid ].checked,
							'onUpdate:modelValue': ( value ) => {
								implementationsState.value[ zid ].checked = value;
							},
							hideLabel: true
						}
						// class: 'ext-wikilambda-app-function-viewer-details-table__item',
						// id: implementationLabelData.label
					},
					// Column 2: name
					name: {
						component: 'a',
						title: implementationLabelData.label,
						props: {
							href: urlUtils.generateViewUrl( { langCode: store.getUserLangCode, zid } ),
							lang: implementationLabelData.langCode,
							dir: implementationLabelData.langDir
						}
					},
					// Column 3: status
					status: {
						component: 'cdx-info-chip',
						title: i18n( isConnected ?
							'wikilambda-function-implementation-state-approved' :
							'wikilambda-function-implementation-state-deactivated'
						).text(),
						props: {
							status: isConnected ? 'success' : 'warning'
						}
					},
					// Column 4: language
					language: {
						title: language || ''
					},
					// Column 4: test results
					result: {
						title: testResults.passing + '/' + testResults.total
					}
				} );
			}
			return tableData;
		} );

		/**
		 * Zids of all tests for this function
		 *
		 * @return {Array}
		 */
		const allTests = computed( () => Object.keys( testsState.value ) );

		/**
		 * Whether any of the disconnected tests are checked
		 *
		 * @return {boolean}
		 */
		const areProposedTestersSelected = computed( () => Object.keys( testsState.value ).some(
			( zid ) => testsState.value[ zid ].checked && !testsState.value[ zid ].available
		) );

		/**
		 * Whether any of the connected tests are checked
		 *
		 * @return {boolean}
		 */
		const areAvailableTestersSelected = computed( () => Object.keys( testsState.value ).some(
			( zid ) => testsState.value[ zid ].checked && testsState.value[ zid ].available
		) );

		/**
		 * Returns the link for add new test page
		 *
		 * @return {string}
		 */
		const addTestLink = computed( () => new mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl( {
			uselang: store.getUserLangCode,
			zid: Constants.Z_TESTER,
			[ Constants.Z_TESTER_FUNCTION ]: store.getCurrentZObjectId
		} ) );

		/**
		 * Build the columns for the Tests table
		 *
		 * @return {Object}
		 */
		const testsColumns = computed( () => {
			if ( !allTests.value.length ) {
				return undefined;
			}

			const columns = [
				{
					id: 'checkbox',
					title: i18n( 'wikilambda-function-implementation-selectall-label' ),
					component: 'cdx-checkbox',
					props: {
						modelValue: areAllRowsChecked( testsState.value ),
						indeterminate: areSomeRowsChecked( testsState.value ),
						'onUpdate:modelValue': ( value ) => checkAllRows( testsState.value, value ),
						hideLabel: true
					},
					class: 'ext-wikilambda-app-function-viewer-details-table__column--checkbox'
				},
				{
					id: 'name',
					title: i18n( 'wikilambda-function-implementation-name-label' )
				},
				{
					id: 'status',
					title: i18n( 'wikilambda-function-implementation-state-label' )
				}
			];

			// Add one column for each implementation selected,
			// or for all visble implementations if none are selected
			for ( const zid of allImplementations.value ) {
				const implementationLabelData = store.getLabelData( zid );
				if ( implementationsState.value[ zid ].checked || !areAnyImplementationsChecked.value ) {
					columns.push( {
						id: zid,
						title: implementationLabelData.label,
						component: 'span',
						props: {
							lang: implementationLabelData.langCode,
							dir: implementationLabelData.langDir
						}
					} );
				}
			}

			return columns;
		} );

		/**
		 *
		 * Build the content rows for the Tests table
		 *
		 * @return {Array}
		 */
		const testsData = computed( () => {
			const tableData = [];
			for ( const zid of allTests.value ) {
				// Get test name or its zid if unnamed:
				const testLabelData = store.getLabelData( zid );

				// Get test connected state:
				const isConnected = store.getConnectedTests.includes( zid );

				// Build row data with first three columns:
				const rowData = {
					// Column 1: checkbox
					checkbox: {
						title: i18n( 'wikilambda-function-implementation-select-label' ),
						component: 'cdx-checkbox',
						props: {
							modelValue: testsState.value[ zid ].checked,
							'onUpdate:modelValue': ( value ) => {
								testsState.value[ zid ].checked = value;
							},
							hideLabel: true
						}
					},
					// Column 2: name
					name: {
						title: testLabelData.label,
						component: 'a',
						props: {
							href: urlUtils.generateViewUrl( { langCode: store.getUserLangCode, zid } ),
							lang: testLabelData.langCode,
							dir: testLabelData.langDir
						}
					},
					// Column 3: status
					status: {
						component: 'cdx-info-chip',
						title: i18n( isConnected ?
							'wikilambda-function-tester-state-approved' :
							'wikilambda-function-tester-state-deactivated'
						).text(),
						props: {
							status: isConnected ? 'success' : 'warning'
						}
					}
				};

				// Add a column per implementation selected
				for ( const impZid of allImplementations.value ) {
					if ( implementationsState.value[ impZid ].checked || !areAnyImplementationsChecked.value ) {
						rowData[ impZid ] = {
							component: 'wl-function-tester-table',
							props: {
								zFunctionId: store.getCurrentZObjectId,
								zImplementationId: impZid,
								zTesterId: zid
							}
						};
					}
				}

				tableData.push( rowData );
			}

			return tableData;
		} );

		/**
		 * Computed property to watch the value of the
		 * fetch flags. The hook will re-run the tests
		 * every time that a change is observed
		 *
		 * @return {boolean}
		 */
		const fetchedObjects = computed( () => implementationsFetched.value && testsFetched.value );

		// Methods
		/**
		 * Closes the warning toast message
		 */
		function closeToast() {
			currentToast.value = null;
		}

		/**
		 * Sets the local implementations state with the properties
		 * checked (set to false) and available
		 *
		 * @param {Array|null} zids
		 */
		function setImplementationsState( zids = null ) {
			const allZids = zids === null ? allImplementations.value : zids;

			for ( const zid of allZids ) {
				const isConnected = store.getConnectedImplementations.includes( zid );
				implementationsState.value[ zid ] = {
					available: isConnected,
					checked: false
				};
			}
		}

		/**
		 * Sets the local implementations state with the properties
		 * checked (set to false) and available
		 *
		 * @param {Array|null} zids
		 */
		function setTestsState( zids = null ) {
			const allZids = zids === null ? allTests.value : zids;
			for ( const zid of allZids ) {
				const isConnected = store.getConnectedTests.includes( zid );
				testsState.value[ zid ] = {
					available: isConnected,
					checked: false
				};
			}
		}

		/**
		 * Fetches all the associated implementations and
		 * initializes the local state variables
		 */
		function initializeImplementations() {
			// Fetch implementations for the current Function Zid
			store.fetchImplementations( store.getCurrentZObjectId ).then( ( zids ) => {
				setImplementationsState( zids );
				implementationsFetched.value = true;
			} );
		}

		/**
		 * Fetches all the associated tests and
		 * initializes the local state variables
		 */
		function initializeTests() {
			// Fetch tests for the current Function Zid
			store.fetchTests( store.getCurrentZObjectId ).then( ( zids ) => {
				setTestsState( zids );
				testsFetched.value = true;
			} );
		}

		/**
		 * Get the set of checked implementations and connect them to the current function
		 */
		function connectCheckedImplementations() {
			const zids = Object.keys( implementationsState.value ).filter(
				( zid ) => implementationsState.value[ zid ].checked && !implementationsState.value[ zid ].available
			);

			implementationsLoading.value = true;

			store.connectImplementations( { zids } ).then( () => {
				closeToast();
				setImplementationsState();
			} ).catch( ( error ) => {
				currentToast.value = error.messageOrFallback( 'wikilambda-unknown-save-error-message' );
			} ).finally( () => {
				implementationsLoading.value = false;
			} );
		}

		/**
		 * Get the set of checked implementations and disconnect them from the current function
		 */
		function disconnectCheckedImplementations() {
			const zids = Object.keys( implementationsState.value ).filter(
				( zid ) => implementationsState.value[ zid ].checked && implementationsState.value[ zid ].available
			);

			implementationsLoading.value = true;
			store.disconnectImplementations( { zids } ).then( () => {
				closeToast();
				setImplementationsState();
			} ).catch( ( error ) => {
				currentToast.value = error.messageOrFallback( 'wikilambda-unknown-save-error-message' );
			} ).finally( () => {
				implementationsLoading.value = false;
			} );
		}

		/**
		 * Get the set of checked tests and connect them to the current function
		 */
		function connectCheckedTests() {
			const zids = Object.keys( testsState.value )
				.filter( ( zid ) => testsState.value[ zid ].checked && !testsState.value[ zid ].available );

			testsLoading.value = true;
			store.connectTests( { zids } ).then( () => {
				closeToast();
				setTestsState();
			} ).catch( ( error ) => {
				currentToast.value = error.messageOrFallback( 'wikilambda-unknown-save-error-message' );
			} ).finally( () => {
				testsLoading.value = false;
			} );
		}

		/**
		 * Get the set of checked tests and disconnect them from the current function
		 */
		function disconnectCheckedTests() {
			const zids = Object.keys( testsState.value )
				.filter( ( zid ) => testsState.value[ zid ].checked && testsState.value[ zid ].available );

			testsLoading.value = true;
			store.disconnectTests( { zids } ).then( () => {
				closeToast();
				setTestsState();
			} ).catch( ( error ) => {
				currentToast.value = error.messageOrFallback( 'wikilambda-unknown-save-error-message' );
			} ).finally( () => {
				testsLoading.value = false;
			} );
		}

		/**
		 * Triggers the re-run of all the tests and sets the result
		 */
		function runTesters() {
			store.getTestResults( {
				zFunctionId: store.getCurrentZObjectId,
				zImplementations: allImplementations.value,
				zTesters: allTests.value,
				clearPreviousResults: true
			} );
		}

		// Watch
		watch( fetchedObjects, ( value ) => {
			if ( value ) {
				runTesters();
			}
		} );

		// Lifecycle
		onMounted( () => {
			initializeImplementations();
			initializeTests();
		} );

		// Return all properties and methods for the template
		return {
			addImplementationLink,
			addTestLink,
			areAvailableImplementationsSelected,
			areAvailableTestersSelected,
			areProposedImplementationsSelected,
			areProposedTestersSelected,
			closeToast,
			connectCheckedImplementations,
			connectCheckedTests,
			currentToast,
			disconnectCheckedImplementations,
			disconnectCheckedTests,
			implementationsColumns,
			implementationsData,
			implementationsFetched,
			implementationsLoading,
			testsColumns,
			testsData,
			testsFetched,
			testsLoading,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-viewer-details {
	display: flex;
	-webkit-flex-flow: row wrap;
	flex-flow: row wrap;
	gap: @spacing-150 @spacing-400;

	@media screen and ( max-width: @max-width-breakpoint-mobile ) {
		flex-flow: column wrap;
	}

	.ext-wikilambda-app-function-viewer-details__tables {
		flex: 1;
		flex-grow: 1;
		width: calc( 100% - 400px );

		@media screen and ( max-width: @max-width-breakpoint-mobile ) {
			width: @size-full;
		}
	}

	.ext-wikilambda-app-function-viewer-details-table__column--checkbox {
		width: @spacing-125;
	}
}
</style>
