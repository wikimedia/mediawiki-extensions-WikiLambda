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
				:title="$i18n( 'wikilambda-function-implementation-table-header' ).text()"
				:can-connect="areProposedImplementationsSelected"
				:can-disconnect="areAvailableImplementationsSelected"
				:empty-text="implementationsFetched ?
					$i18n( 'wikilambda-implementation-none-found' ).text() : $i18n( 'wikilambda-loading' ).text()"
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
				:title="$i18n( 'wikilambda-function-test-cases-table-header' ).text()"
				:can-connect="areProposedTestersSelected"
				:can-disconnect="areAvailableTestersSelected"
				:empty-text="testsFetched ?
					$i18n( 'wikilambda-tester-none-found' ).text() : $i18n( 'wikilambda-loading' ).text()"
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
				:dismiss-button-label="$i18n( 'wikilambda-toast-close' ).text()"
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
const { defineComponent } = require( 'vue' );
const { CdxMessage } = require( '@wikimedia/codex' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const errorUtils = require( '../../../mixins/errorUtils.js' );
const FunctionViewerDetailsTable = require( './FunctionViewerDetailsTable.vue' );
const typeUtils = require( '../../../mixins/typeUtils.js' );
const useMainStore = require( '../../../store/index.js' );
const utilsMixins = require( '../../../mixins/utilsMixins.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-viewer-details',
	components: {
		'wl-function-viewer-details-table': FunctionViewerDetailsTable,
		'cdx-message': CdxMessage
	},
	mixins: [ typeUtils, errorUtils, utilsMixins ],
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		}
	},
	data: function () {
		return {
			/* Local state for function implementations */
			implementationsState: {},
			implementationsFetched: false,
			implementationsLoading: false,

			/* Local state for function tests */
			testsState: {},
			testsFetched: false,
			testsLoading: false,

			currentToast: null
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getConnectedImplementations',
		'getConnectedTests',
		'getCurrentZObjectId',
		'getLabelData',
		'getLanguageOfImplementation',
		'getZTesterPercentage',
		'getTypeOfImplementation',
		'getUserLangCode'
	] ), {
		/**
		 * Zids of all implementations for this function
		 *
		 * @return {Array}
		 */
		allImplementations: function () {
			return Object.keys( this.implementationsState );
		},

		/**
		 * Zids of all implementations already connected to the function
		 *
		 * @return {Array}
		 */
		connectedImplementations: function () {
			return this.getConnectedImplementations( this.rowId );
		},

		/**
		 * Whether any of the available implementations are checked
		 *
		 * @return {boolean}
		 */
		areAnyImplementationsChecked: function () {
			return Object.keys( this.implementationsState ).some(
				( zid ) => this.implementationsState[ zid ].checked
			);
		},

		/**
		 * Whether any of the disconnected implementations are checked
		 *
		 * @return {boolean}
		 */
		areProposedImplementationsSelected: function () {
			return Object.keys( this.implementationsState ).some(
				( zid ) => this.implementationsState[ zid ].checked && !this.implementationsState[ zid ].available
			);
		},

		/**
		 * Whether any of the connected implementations are checked
		 *
		 * @return {boolean}
		 */
		areAvailableImplementationsSelected: function () {
			return Object.keys( this.implementationsState ).some(
				( zid ) => this.implementationsState[ zid ].checked && this.implementationsState[ zid ].available
			);
		},

		/**
		 * Returns the link for add new implementation page
		 *
		 * @return {string}
		 */
		addImplementationLink: function () {
			return new mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl( {
				uselang: this.getUserLangCode,
				zid: Constants.Z_IMPLEMENTATION,
				[ Constants.Z_IMPLEMENTATION_FUNCTION ]: this.getCurrentZObjectId
			} );
		},

		/**
		 * Build the columns for the Implementations table
		 *
		 * @return {Object}
		 */
		implementationsColumns: function () {
			if ( !this.allImplementations.length ) {
				return undefined;
			}
			return [
				{
					id: 'checkbox',
					title: this.$i18n( 'wikilambda-function-implementation-selectall-label' ),
					component: 'cdx-checkbox',
					props: {
						modelValue: this.areAllRowsChecked( this.implementationsState ),
						indeterminate: this.areSomeRowsChecked( this.implementationsState ),
						'onUpdate:modelValue': ( value ) => this.checkAllRows( this.implementationsState, value ),
						hideLabel: true
					}
				},
				{ id: 'name', title: this.$i18n( 'wikilambda-function-implementation-name-label' ) },
				{ id: 'status', title: this.$i18n( 'wikilambda-function-implementation-state-label' ) },
				{ id: 'language', title: this.$i18n( 'wikilambda-function-implementation-language-label' ) },
				{ id: 'result', title: this.$i18n( 'wikilambda-function-implementation-tests-passed-label' ) }
			];
		},

		/**
		 * Build the content rows for the Implementations table
		 *
		 * @return {Array}
		 */
		implementationsData: function () {
			const tableData = [];
			for ( const zid of this.allImplementations ) {
				// Get implementation name or its zid if unnamed:
				const implementationLabelData = this.getLabelData( zid );

				// Get implementation connected state:
				const isConnected = this.connectedImplementations.includes( zid );

				// Get implementation test results:
				const testResults = this.getZTesterPercentage( zid );

				// Get implementation type and language:
				const type = this.getTypeOfImplementation( zid );
				let language;
				switch ( type ) {
					case Constants.Z_IMPLEMENTATION_COMPOSITION:
						language = this.$i18n( 'wikilambda-implementation-selector-composition' ).text();
						break;
					case Constants.Z_IMPLEMENTATION_BUILT_IN:
						language = this.$i18n( 'wikilambda-implementation-selector-built-in' ).text();
						break;
					default:
						language = this.getLanguageOfImplementation( zid );
						if ( this.isValidZidFormat( language ) ) {
							this.fetchZids( { zids: [ language ] } );
							language = this.getLabelData( language ).label;
						}
				}

				// Build the table data for the implementations table
				tableData.push( {
					// Column 1: checkbox
					checkbox: {
						title: this.$i18n( 'wikilambda-function-implementation-select-label' ),
						component: 'cdx-checkbox',
						props: {
							modelValue: this.implementationsState[ zid ].checked,
							'onUpdate:modelValue': ( value ) => {
								this.implementationsState[ zid ].checked = value;
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
							href: `/view/${ this.getUserLangCode }/${ zid }`,
							lang: implementationLabelData.langCode,
							dir: implementationLabelData.langDir
						}
					},
					// Column 3: status
					status: {
						component: 'cdx-info-chip',
						title: this.$i18n( isConnected ?
							'wikilambda-function-implementation-state-approved' :
							'wikilambda-function-implementation-state-deactivated'
						).text(),
						props: {
							status: isConnected ? 'success' : 'warning'
						}
					},
					// Column 4: language
					language: {
						title: language
					},
					// Column 4: test results
					result: {
						title: testResults.passing + '/' + testResults.total
					}
				} );
			}

			return tableData;
		},

		/**
		 * Zids of all tests for this function
		 *
		 * @return {Array}
		 */
		allTests: function () {
			return Object.keys( this.testsState );
		},

		/**
		 * Zids of all tests already connected to the function
		 *
		 * @return {Array}
		 */
		connectedTests: function () {
			return this.getConnectedTests( this.rowId );
		},

		/**
		 * Whether any of the disconnected tests are checked
		 *
		 * @return {boolean}
		 */
		areProposedTestersSelected: function () {
			return Object.keys( this.testsState ).some(
				( zid ) => this.testsState[ zid ].checked && !this.testsState[ zid ].available
			);
		},

		/**
		 * Whether any of the connected tests are checked
		 *
		 * @return {boolean}
		 */
		areAvailableTestersSelected: function () {
			return Object.keys( this.testsState ).some(
				( zid ) => this.testsState[ zid ].checked && this.testsState[ zid ].available
			);
		},

		/**
		 * Returns the link for add new test page
		 *
		 * @return {string}
		 */
		addTestLink: function () {
			return new mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl( {
				uselang: this.getUserLangCode,
				zid: Constants.Z_TESTER,
				[ Constants.Z_TESTER_FUNCTION ]: this.getCurrentZObjectId
			} );
		},

		/**
		 * Build the columns for the Tests table
		 *
		 * @return {Object}
		 */
		testsColumns: function () {

			if ( !this.allTests.length ) {
				return undefined;
			}

			const columns = [
				{

					id: 'checkbox',
					title: this.$i18n( 'wikilambda-function-implementation-selectall-label' ),
					component: 'cdx-checkbox',
					props: {
						modelValue: this.areAllRowsChecked( this.testsState ),
						indeterminate: this.areSomeRowsChecked( this.testsState ),
						'onUpdate:modelValue': ( value ) => this.checkAllRows( this.testsState, value ),
						hideLabel: true
					}
				},
				{ id: 'name', title: this.$i18n( 'wikilambda-function-implementation-name-label' ) },
				{ id: 'status', title: this.$i18n( 'wikilambda-function-implementation-state-label' ) }
			];

			// Add one column for each implementation selected,
			// or for all visble implementations if none are selected
			for ( const zid of this.allImplementations ) {
				const implementationLabelData = this.getLabelData( zid );
				if ( this.implementationsState[ zid ].checked || !this.areAnyImplementationsChecked ) {
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
		},

		/**
		 *
		 * Build the content rows for the Tests table
		 *
		 * @return {Array}
		 */
		testsData: function () {
			const tableData = [];
			for ( const zid of this.allTests ) {
				// Get test name or its zid if unnamed:
				const testLabelData = this.getLabelData( zid );

				// Get test connected state:
				const isConnected = this.connectedTests.includes( zid );

				// Build row data with first three columns:
				const rowData = {
					// Column 1: checkbox
					checkbox: {
						title: this.$i18n( 'wikilambda-function-implementation-select-label' ),
						component: 'cdx-checkbox',
						props: {
							modelValue: this.testsState[ zid ].checked,
							'onUpdate:modelValue': ( value ) => {
								this.testsState[ zid ].checked = value;
							},
							hideLabel: true
						}
					},
					// Column 2: name
					name: {
						title: testLabelData.label,
						component: 'a',
						props: {
							href: `/view/${ this.getUserLangCode }/${ zid }`,
							lang: testLabelData.langCode,
							dir: testLabelData.langDir
						}
					},
					// Column 3: status
					status: {
						component: 'cdx-info-chip',
						title: this.$i18n( isConnected ?
							'wikilambda-function-tester-state-approved' :
							'wikilambda-function-tester-state-deactivated'
						).text(),
						props: {
							status: isConnected ? 'success' : 'warning'
						}
					}
				};

				// Add a column per implementation selected
				for ( const impZid of this.allImplementations ) {
					if ( this.implementationsState[ impZid ].checked || !this.areAnyImplementationsChecked ) {
						rowData[ impZid ] = {
							component: 'wl-function-tester-table',
							props: {
								zFunctionId: this.getCurrentZObjectId,
								zImplementationId: impZid,
								zTesterId: zid
							}
						};
					}
				}

				tableData.push( rowData );
			}

			return tableData;
		},

		/**
		 * Computed property to watch the value of the
		 * fetch flags. The hook will re-run the tests
		 * every time that a change is observed
		 *
		 * @return {boolean}
		 */
		fetchedObjects: function () {
			return this.implementationsFetched && this.testsFetched;
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'connectImplementations',
		'connectTests',
		'disconnectImplementations',
		'disconnectTests',
		'fetchImplementations',
		'fetchTests',
		'fetchZids',
		'getTestResults'
	] ), {
		/**
		 * Fetches all the associated implementations and
		 * initializes the local state variables
		 */
		initializeImplementations: function () {
			// Fetch implementations for the current Function Zid
			this.fetchImplementations( this.getCurrentZObjectId ).then( ( zids ) => {
				this.setImplementationsState( zids );
				this.implementationsFetched = true;
			} );
		},

		/**
		 * Fetches all the associated tests and
		 * initializes the local state variables
		 */
		initializeTests: function () {
			// Fetch tests for the current Function Zid
			this.fetchTests( this.getCurrentZObjectId ).then( ( zids ) => {
				this.setTestsState( zids );
				this.testsFetched = true;
			} );
		},

		/**
		 * Sets the local implementations state with the properties
		 * checked (set to false) and available
		 *
		 * @param {Array|null} zids
		 */
		setImplementationsState: function ( zids = null ) {
			const allZids = zids === null ? this.allImplementations : zids;
			for ( const zid of allZids ) {
				const isConnected = this.connectedImplementations.includes( zid );
				this.implementationsState[ zid ] = {
					available: isConnected,
					checked: false
				};
			}
		},

		/**
		 * Sets the local implementations state with the properties
		 * checked (set to false) and available
		 *
		 * @param {Array|null} zids
		 */
		setTestsState: function ( zids = null ) {
			const allZids = zids === null ? this.allTests : zids;
			for ( const zid of allZids ) {
				const isConnected = this.connectedTests.includes( zid );
				this.testsState[ zid ] = {
					available: isConnected,
					checked: false
				};
			}
		},

		/**
		 * Get the set of checked implementations and connect them to the current function
		 */
		connectCheckedImplementations: function () {
			const zids = Object.keys( this.implementationsState ).filter(
				( zid ) => this.implementationsState[ zid ].checked && !this.implementationsState[ zid ].available
			);

			this.implementationsLoading = true;

			this.connectImplementations( {
				rowId: this.rowId,
				zids
			} ).then( () => {
				this.closeToast();
				this.setImplementationsState();
			} ).catch( ( error ) => {
				this.currentToast = error.messageOrFallback( Constants.errorCodes.UNKNOWN_SAVE_ERROR );
			} ).finally( () => {
				this.implementationsLoading = false;
			} );
		},

		/**
		 * Get the set of checked implementations and disconnect them from the current function
		 */
		disconnectCheckedImplementations: function () {
			const zids = Object.keys( this.implementationsState ).filter(
				( zid ) => this.implementationsState[ zid ].checked && this.implementationsState[ zid ].available
			);

			this.implementationsLoading = true;
			this.disconnectImplementations( {
				rowId: this.rowId,
				zids
			} ).then( () => {
				this.closeToast();
				this.setImplementationsState();
			} ).catch( ( error ) => {
				this.currentToast = error.messageOrFallback( Constants.errorCodes.UNKNOWN_SAVE_ERROR );
			} ).finally( () => {
				this.implementationsLoading = false;
			} );
		},

		/**
		 * Get the set of checked tests and connect them to the current function
		 */
		connectCheckedTests: function () {
			const zids = Object.keys( this.testsState )
				.filter( ( zid ) => this.testsState[ zid ].checked && !this.testsState[ zid ].available );

			this.testsLoading = true;
			this.connectTests( {
				rowId: this.rowId,
				zids
			} ).then( () => {
				this.closeToast();
				this.setTestsState();
			} ).catch( ( error ) => {
				this.currentToast = error.messageOrFallback( Constants.errorCodes.UNKNOWN_SAVE_ERROR );
			} ).finally( () => {
				this.testsLoading = false;
			} );
		},

		/**
		 * Get the set of checked tests and disconnect them from the current function
		 */
		disconnectCheckedTests: function () {
			const zids = Object.keys( this.testsState )
				.filter( ( zid ) => this.testsState[ zid ].checked && this.testsState[ zid ].available );

			this.testsLoading = true;
			this.disconnectTests( {
				rowId: this.rowId,
				zids
			} ).then( () => {
				this.closeToast();
				this.setTestsState();
			} ).catch( ( error ) => {
				this.currentToast = error.messageOrFallback( Constants.errorCodes.UNKNOWN_SAVE_ERROR );
			} ).finally( () => {
				this.testsLoading = false;
			} );
		},

		/**
		 * Triggers the re-run of all the tests and sets the result
		 */
		runTesters: function () {
			this.getTestResults( {
				zFunctionId: this.getCurrentZObjectId,
				zImplementations: this.allImplementations,
				zTesters: this.allTests,
				clearPreviousResults: true
			} );
		},

		/**
		 * Returns whether all the rows of the given state object are checked
		 *
		 * @param {Object} rows
		 * @return {boolean}
		 */
		areAllRowsChecked: function ( rows ) {
			return Object.keys( rows ).every( ( zid ) => rows[ zid ].checked );
		},

		/**
		 * Returns whether some of the rows of the given state object are checked
		 *
		 * @param {Object} rows
		 * @return {boolean}
		 */
		areSomeRowsChecked: function ( rows ) {
			return Object.keys( rows ).some( ( zid ) => rows[ zid ].checked );
		},

		/**
		 * Modifies the given state object to check or uncheck all the rows
		 *
		 * @param {Object} rows
		 * @param {boolean} value
		 */
		checkAllRows: function ( rows, value ) {
			for ( const zid in rows ) {
				rows[ zid ].checked = value;
			}
		},

		/**
		 * Closes the warning toast message
		 */
		closeToast: function () {
			this.currentToast = null;
		}
	} ),
	watch: {
		fetchedObjects: function ( value ) {
			if ( value ) {
				this.runTesters();
			}
		}
	},
	mounted: function () {
		this.initializeImplementations();
		this.initializeTests();
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
}
</style>
