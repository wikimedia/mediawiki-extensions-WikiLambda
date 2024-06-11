<!--
	WikiLambda Vue component for the details tab in the ZFunction Viewer.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<main class="ext-wikilambda-function-details">
		<section class="ext-wikilambda-function-details__tables">
			<wl-function-viewer-details-table
				:type="implementationType"
				:header="implementationsHeader"
				:body="implementationsBody"
				:title="$i18n( 'wikilambda-function-implementation-table-header' ).text()"
				:current-page="implementationsPage"
				:total-pages="implementationsTotalPages"
				:showing-all="implementationsShowAll"
				:can-connect="areProposedImplementationsSelected"
				:can-disconnect="areAvailableImplementationsSelected"
				:empty-text="implementationsFetched ?
					$i18n( 'wikilambda-implementation-none-found' ).text() : $i18n( 'wikilambda-loading' ).text()"
				:is-loading="implementationsLoading"
				:add-link="addImplementationLink"
				data-testid="function-implementations-table"
				@update-page="updateImplementationPage"
				@reset-view="resetImplementationView"
				@connect="connectCheckedImplementations"
				@disconnect="disconnectCheckedImplementations"
			></wl-function-viewer-details-table>
			<wl-function-viewer-details-table
				:type="testType"
				:header="testsHeader"
				:body="testsBody"
				:title="$i18n( 'wikilambda-function-test-cases-table-header' ).text()"
				:current-page="testsPage"
				:total-pages="testsTotalPages"
				:showing-all="testsShowAll"
				:can-connect="areProposedTestersSelected"
				:can-disconnect="areAvailableTestersSelected"
				:empty-text="testsFetched ?
					$i18n( 'wikilambda-tester-none-found' ).text() : $i18n( 'wikilambda-loading' ).text()"
				:is-loading="testsLoading"
				:add-link="addTestLink"
				data-testid="function-testers-table"
				@update-page="updateTestersPage"
				@reset-view="resetTestersView"
				@connect="connectCheckedTests"
				@disconnect="disconnectCheckedTests"
			></wl-function-viewer-details-table>
		</section>
		<div
			v-if="!!currentToast"
			class="ext-wikilambda-toast-message"
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
const FunctionViewerDetailsTable = require( './FunctionViewerDetailsTable.vue' ),
	Constants = require( '../../../Constants.js' ),
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

module.exports = exports = defineComponent( {
	name: 'wl-function-viewer-details',
	components: {
		'wl-function-viewer-details-table': FunctionViewerDetailsTable,
		'cdx-message': CdxMessage
	},
	mixins: [ typeUtils ],
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
			implementationType: Constants.Z_IMPLEMENTATION,
			implementationsState: {},
			implementationsPage: 1,
			implementationsFetched: false,
			implementationsLoading: false,
			implementationsShowAll: false,

			/* Local state for function tests */
			testType: Constants.Z_TYPE,
			testsState: {},
			testsPage: 1,
			testsFetched: false,
			testsLoading: false,
			testsShowAll: false,

			currentToast: null
		};
	},
	computed: Object.assign( mapGetters( [
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
		 * Zids of all the implementations visible in the table
		 *
		 * @return {Array}
		 */
		visibleImplementations: function () {
			return this.implementationsShowAll ?
				this.allImplementations :
				this.paginatedImplementations[ this.implementationsPage ];
		},

		/**
		 * Return the implementations structured into pages
		 *
		 * @return {Object}
		 */
		paginatedImplementations: function () {
			return this.paginateList( this.allImplementations );
		},

		/**
		 * Total number of implementation pages
		 *
		 * @return {number}
		 */
		implementationsTotalPages: function () {
			return Object.keys( this.paginatedImplementations ).length;
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
		 * Build the header row for the Implementations table
		 *
		 * @return {Object}
		 */
		implementationsHeader: function () {
			return ( this.visibleImplementations.length === 0 ) ? undefined :
				{
					checkbox: {
						title: '',
						component: 'cdx-checkbox',
						props: {
							modelValue: this.areAllRowsChecked( this.implementationsState ),
							'onUpdate:modelValue': ( value ) => this.checkAllRows( this.implementationsState, value )
						},
						class: 'ext-wikilambda-function-details-table-text'
					},
					name: {
						title: this.$i18n( 'wikilambda-function-implementation-name-label' ),
						class: 'ext-wikilambda-function-details-table-text',
						id: 'implementations-header-checkbox'
					},
					state: {
						title: this.$i18n( 'wikilambda-function-implementation-state-label' ),
						class: 'ext-wikilambda-function-details-table-text'
					},
					language: {
						title: this.$i18n( 'wikilambda-function-implementation-language-label' ),
						class: 'ext-wikilambda-function-details-table-text'
					},
					testsPassed: {
						title: this.$i18n( 'wikilambda-function-implementation-tests-passed-label' ),
						class: 'ext-wikilambda-function-details-table-text'
					}
				};
		},

		/**
		 * Build the content rows for the Implementations table
		 *
		 * @return {Array}
		 */
		implementationsBody: function () {
			const tableData = [];
			for ( const zid of this.visibleImplementations ) {
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
						title: '',
						component: 'cdx-checkbox',
						props: {
							modelValue: this.implementationsState[ zid ].checked,
							'onUpdate:modelValue': ( value ) => {
								this.implementationsState[ zid ].checked = value;
							}
						},
						class: 'ext-wikilambda-function-details-table-item',
						id: implementationLabelData.label
					},
					// Column 2: name
					name: {
						title: implementationLabelData.label,
						component: 'a',
						props: {
							href: `/view/${ this.getUserLangCode }/${ zid }`,
							lang: implementationLabelData.langCode,
							dir: implementationLabelData.langDir
						},
						class: 'ext-wikilambda-function-details-table-item'
					},
					// Column 3: status
					state: {
						component: 'cdx-info-chip',
						title: this.$i18n( isConnected ?
							'wikilambda-function-implementation-state-approved' :
							'wikilambda-function-implementation-state-deactivated'
						).text(),
						props: {
							status: isConnected ? 'success' : 'warning'
						},
						class: 'ext-wikilambda-function-details-table-item'
					},
					// Column 4: language
					language: {
						title: language,
						class: 'ext-wikilambda-function-details-table-item'
					},
					// Column 4: passed tests
					testsPassed: {
						title: testResults.passing + '/' + testResults.total
					},
					// Row class
					class: this.implementationsState[ zid ].checked ? 'ext-wikilambda-function-details-table__row--active' : null
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
		 * Zids of all the tests visible in the table
		 *
		 * @return {Array}
		 */
		visibleTests: function () {
			return this.testsShowAll ?
				this.allTests :
				this.paginatedTests[ this.testsPage ];
		},

		/**
		 * Return the tests structured into pages
		 *
		 * @return {Object}
		 */
		paginatedTests: function () {
			return this.paginateList( this.allTests );
		},

		/**
		 * Total number of tests pages
		 *
		 * @return {number}
		 */
		testsTotalPages: function () {
			return Object.keys( this.paginatedTests ).length;
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
		 * Build the header row for the Implementations table
		 *
		 * @return {Object}
		 */
		testsHeader: function () {
			if ( this.visibleTests.length === 0 ) {
				return undefined;
			}

			const headers = {
				checkbox: {
					title: '',
					component: 'cdx-checkbox',
					props: {
						modelValue: this.areAllRowsChecked( this.testsState ),
						'onUpdate:modelValue': ( value ) => this.checkAllRows( this.testsState, value )
					},
					class: 'ext-wikilambda-function-details-table-text'
				},
				name: {
					title: this.$i18n( 'wikilambda-function-implementation-name-label' ),
					class: 'ext-wikilambda-function-details-table-text'
				},
				state: {
					title: this.$i18n( 'wikilambda-function-implementation-state-label' ),
					class: 'ext-wikilambda-function-details-table-text'
				}
			};

			// Add one column for each implementation selected,
			// or for all visble implementations if none are selected
			for ( const zid of this.visibleImplementations ) {
				const implementationLabelData = this.getLabelData( zid );
				if ( this.implementationsState[ zid ].checked || !this.areAnyImplementationsChecked ) {
					headers[ zid ] = {
						title: implementationLabelData.label,
						component: 'span',
						props: {
							lang: implementationLabelData.langCode,
							dir: implementationLabelData.langDir
						},
						class: 'ext-wikilambda-function-details-table-text'
					};
				}
			}

			return headers;
		},

		/**
		 * Build the content rows for the Tests table
		 *
		 * @return {Array}
		 */
		testsBody: function () {
			const tableData = [];
			for ( const zid of this.visibleTests ) {
				// Get test name or its zid if unnamed:
				const testLabelData = this.getLabelData( zid );

				// Get test connected state:
				const isConnected = this.connectedTests.includes( zid );

				// Build row data with first three columns:
				const rowData = {
					// Column 1: checkbox
					checkbox: {
						title: '',
						component: 'cdx-checkbox',
						props: {
							modelValue: this.testsState[ zid ].checked,
							'onUpdate:modelValue': ( value ) => {
								this.testsState[ zid ].checked = value;
							}
						},
						class: 'ext-wikilambda-function-details-table-item'
					},
					// Column 2: name
					name: {
						title: testLabelData.label,
						component: 'a',
						props: {
							href: `/view/${ this.getUserLangCode }/${ zid }`,
							lang: testLabelData.langCode,
							dir: testLabelData.langDir
						},
						class: 'ext-wikilambda-function-details-table-item'
					},
					// Column 3: status
					state: {
						component: 'cdx-info-chip',
						title: this.$i18n( isConnected ?
							'wikilambda-function-tester-state-approved' :
							'wikilambda-function-tester-state-deactivated'
						).text(),
						props: {
							status: isConnected ? 'success' : 'warning'
						},
						class: 'ext-wikilambda-function-details-table-item'
					},
					// Row class
					class: this.testsState[ zid ].checked ? 'ext-wikilambda-function-details-table__row--active' : null
				};

				// Add a column per implementation selected
				for ( const impZid of this.visibleImplementations ) {
					if ( this.implementationsState[ impZid ].checked || !this.areAnyImplementationsChecked ) {
						rowData[ impZid ] = {
							component: 'wl-function-tester-table',
							props: {
								zFunctionId: this.getCurrentZObjectId,
								zImplementationId: impZid,
								zTesterId: zid
							},
							class: 'ext-wikilambda-function-details-table-item'
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
	methods: Object.assign( mapActions( [
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
				this.setImplementationsState();
			} ).catch( ( error ) => {
				this.currentToast = error.error.message;
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
				this.setImplementationsState();
			} ).catch( ( error ) => {
				this.currentToast = error.error.message;
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
				this.setTestsState();
			} ).catch( ( error ) => {
				this.currentToast = error.error.message;
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
				this.setTestsState();
			} ).catch( ( error ) => {
				this.currentToast = error.error.message;
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
		 * Convert an array into a paginated object structure
		 *
		 * @param {Array} items
		 * @return {Object}
		 */
		paginateList: function ( items ) {
			const paginatedItems = {};
			let pageNum = 1;
			if ( items.length > 0 ) {
				for ( let i = 0; i < items.length; i += Constants.PAGINATION_SIZE ) {
					const endIndex = Math.min( items.length, i + Constants.PAGINATION_SIZE );
					const pageItems = items.slice( i, endIndex );
					paginatedItems[ pageNum ] = pageItems;
					pageNum++;
				}
				return paginatedItems;
			}
			return { 1: items };
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
		 * Sets the current page of the implementations table
		 *
		 * @param {number} page
		 */
		updateImplementationPage: function ( page ) {
			this.implementationsPage = page;
		},

		/**
		 * Sets the current page of the tests table
		 *
		 * @param {number} page
		 */
		updateTestersPage: function ( page ) {
			this.testsPage = page;
		},

		/**
		 * Toggle the view all/view less button in the implementations table
		 */
		resetImplementationView: function () {
			this.implementationsShowAll = !this.implementationsShowAll;
		},

		/**
		 * Toggle the view all/view less button in the implementations table
		 */
		resetTestersView: function () {
			this.testsShowAll = !this.testsShowAll;
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
@import '../../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-function-details {
	display: flex;
	-webkit-flex-flow: row wrap;
	flex-flow: row wrap;
	gap: @spacing-150 @spacing-400;

	&__tables {
		flex: 1;
		flex-grow: 1;
		width: calc( 100% - 400px );
	}

	@media screen and ( max-width: @max-width-breakpoint-mobile ) {
		flex-flow: column wrap;

		&__tables {
			width: @size-full;
		}
	}
}
</style>
