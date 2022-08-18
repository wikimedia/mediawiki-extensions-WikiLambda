<template>
	<!--
		WikiLambda Vue component for the details tab in the ZFunction Viewer.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<main class="ext-wikilambda-function-details">
		<div class="ext-wikilambda-function-details__summary">
			{{ $i18n( 'wikilambda-function-details-summary' ).text() }}
			<!-- TODO(T309199): link to process page once it exists -->
			<a href="#"> {{ $i18n( 'wikilambda-function-details-summary-learn-more' ).text() }} </a>
		</div>
		<section class="ext-wikilambda-function-details__sidebar">
			<function-viewer-details-sidebar :zobject-id="zobjectId"></function-viewer-details-sidebar>
		</section>
		<section class="ext-wikilambda-function-details__tables">
			<function-viewer-details-table
				:header="implementationsHeader"
				:body="implementationBody"
				:title="$i18n( 'wikilambda-function-implementation-table-header' ).text()"
				:current-page="currentImplementationPage"
				:total-pages="numberOfImplementationPages"
				:showing-all="implementationShowAll"
				@update-page="updateImplementationPage"
				@reset-view="resetImplementationView"
			></function-viewer-details-table>
			<!-- TODO(T310182): have the implementation table filter the tester table -->
			<function-viewer-details-table
				:header="testersHeader"
				:body="testersBody"
				:title="$i18n( 'wikilambda-function-test-cases-table-header' ).text()"
				:current-page="currentTesterPage"
				:total-pages="numberofTesterPages"
				:showing-all="testerShowAll"
				@update-page="updateTestersPage"
				@reset-view="resetTestersView"
			></function-viewer-details-table>
		</section>
	</main>
</template>

<script>
var Vue = require( 'vue' );
var FunctionViewerDetailsSidebar = require( './details/FunctionViewerDetailsSidebar.vue' ),
	FunctionViewerDetailsImplementationTable = require( './details/FunctionViewerDetailsTable.vue' ),
	Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	CdxCheckbox = require( '@wikimedia/codex' ).CdxCheckbox,
	WikilambdaChip = require( '../../components/base/Chip.vue' ),
	TableTesterStatus = require( './partials/TesterTableStatus.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

Vue.component( 'cdx-checkbox', CdxCheckbox.default || CdxCheckbox );
Vue.component( 'wikilambda-chip', WikilambdaChip.default || WikilambdaChip );
Vue.component( 'tester-table-status', TableTesterStatus.default || TableTesterStatus );

// @vue/component
module.exports = exports = {
	name: 'function-details',
	components: {
		'function-viewer-details-sidebar': FunctionViewerDetailsSidebar,
		'function-viewer-details-table': FunctionViewerDetailsImplementationTable
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: false,
			default: 0
		}
	},
	data: function () {
		return {
			implementationIds: [],
			filterState: '',
			checkValue: '',
			currentImplementationPage: 1,
			implementationShowAll: false,
			currentTesterPage: 1,
			testerShowAll: false
		};
	},
	computed: $.extend( {},
		mapGetters( [
			'getUnattachedZTesters',
			'getZkeyLabels',
			'getPaginatedImplementations',
			'getAllZImplementations',
			'getUnattachedZImplementations',
			'getPaginatedTesters',
			'getAllZTesters',
			'getZkeys'
		] ),
		{
			implementationsHeader: function () {
				if ( this.implementationBody.length === 0 ) {
					return {
						name: {
							title: this.$i18n( 'wikilambda-implementation-none-found' ),
							class: 'ext-wikilambda-function-details-table-no-text'
						}
					};
				}

				const headers = {
					checkbox: {
						title: '',
						component: 'cdx-checkbox',
						props: {
							vModel: this.checkValue
						},
						class: 'ext-wikilambda-function-details-table-text'
					},
					name: {
						title: this.$i18n( 'wikilambda-function-implementation-name-label' ),
						class: 'ext-wikilambda-function-details-table-text'
					},
					language: {
						title: this.$i18n( 'wikilambda-function-implementation-language-label' ),
						class: 'ext-wikilambda-function-details-table-text'
					},
					state: {
						title: this.$i18n( 'wikilambda-function-implementation-state-label' ),
						class: 'ext-wikilambda-function-details-table-text'
					},
					testsPassed: {
						title: this.$i18n( 'wikilambda-function-implementation-tests-passed-label' ),
						class: 'ext-wikilambda-function-details-table-text'
					}
				};

				return headers;
			},
			numberOfImplementationPages: function () {
				return Object.keys( this.getPaginatedImplementations ).length;
			},
			numberofTesterPages: function () {
				return Object.keys( this.getPaginatedTesters ).length;
			},
			implementationBody: function () {
				const visibleImplementations = this.implementationShowAll ? this.getAllZImplementations :
					this.getPaginatedImplementations[ this.currentImplementationPage ];
				const tableData = [];
				// iterate over each implementation for this function
				for ( const item in visibleImplementations ) {
					// get the state of the implementation ( available | proposed )
					let zImplementationState = this.$i18n( 'wikilambda-function-implementation-state-available' ).text();
					if ( this.isFunctionItemAttached(
						visibleImplementations[ item ],
						this.getUnattachedZImplementations
					) ) {
						zImplementationState = this.$i18n( 'wikilambda-function-implementation-state-proposed' ).text();
					}

					// get the language of the implementation
					var language = this.$i18n( 'wikilambda-implementation-selector-composition' );
					var zImplementationObj = this.getZkeys[ visibleImplementations[ item ] ];
					if ( zImplementationObj && zImplementationObj[ Constants.Z_PERSISTENTOBJECT_VALUE ] &&
						zImplementationObj[
							Constants.Z_PERSISTENTOBJECT_VALUE
						][
							Constants.Z_IMPLEMENTATION_BUILT_IN
						]
					) {
						language = this.$i18n( 'wikilambda-implementation-selector-built-in' );
					}
					if ( zImplementationObj && zImplementationObj[ Constants.Z_PERSISTENTOBJECT_VALUE ] &&
						zImplementationObj[
							Constants.Z_PERSISTENTOBJECT_VALUE
						][
							Constants.Z_IMPLEMENTATION_CODE
						]
					) {
						language = zImplementationObj[
							Constants.Z_PERSISTENTOBJECT_VALUE
						][
							Constants.Z_IMPLEMENTATION_CODE
						][
							Constants.Z_CODE_LANGUAGE
						][
							Constants.Z_PROGRAMMING_LANGUAGE_CODE
						];
					}

					// for each implementation, store the checked state
					// (used to determine the columns of the test table)
					if ( !this.implementationIds[ visibleImplementations[ item ] ] ) {
						this.implementationIds[ visibleImplementations[ item ] ] = {
							zid: visibleImplementations[ item ],
							state: zImplementationState,
							checked: false
						};
					}

					// create the table data for the implementations table
					tableData.push( {
						checkbox: {
							title: '',
							component: 'cdx-checkbox',
							props: {
								vModel: this.checkValue,
								// disabled if it is of a different state than a selected implementation
								disabled: this.filterState !== zImplementationState && this.filterState !== '',
								onClick: function () {
									this.handleCheckboxClick( visibleImplementations[ item ] );
								}.bind( this )
							},
							class: 'ext-wikilambda-function-details-table-item',
							id: this.getZkeyLabels[ visibleImplementations[ item ] ] + ' ' + zImplementationState
						},
						name: {
							title: this.getZkeyLabels[ visibleImplementations[ item ] ],
							component: 'a',
							props: {
								href: '/wiki/' + visibleImplementations[ item ]
							},
							class: 'ext-wikilambda-function-details-implementation-table-link ext-wikilambda-function-details-table-item'
						},
						language: {
							title: language,
							class: 'ext-wikilambda-function-details-table-item'
						},
						state: {
							component: 'wikilambda-chip',
							props: {
								editableContainer: false,
								readonly: true,
								text: zImplementationState,
								intent: zImplementationState === this.$i18n( 'wikilambda-function-implementation-state-available' ).text() ? 'success' : 'warning'
							},
							class: 'ext-wikilambda-function-details-table-item'
						},
						// TODO (T310003): fetch these from a cached table in mediawiki
						testsPassed: {
							title: '-'
						},
						class: 'ext-wikilambda-function-details-table-item'
					} );
				}

				return tableData;
			},
			// header columns for test table
			testersHeader: function () {
				if ( this.testersBody.length === 0 ) {
					return {
						name: {
							title: this.$i18n( 'wikilambda-tester-none-found' ),
							class: 'ext-wikilambda-function-details-table-no-text'
						}
					};
				}

				const headers = {
					checkbox: {
						title: '',
						component: 'cdx-checkbox',
						props: {
							vModel: this.checkValue
						},
						class: 'ext-wikilambda-function-details-table-text'
					},
					name: {
						title: this.$i18n( 'wikilambda-function-implementation-name-label' ),
						class: 'ext-wikilambda-function-details-table-text'
					}
				};

				// create one column per implementation selected (or for all implementations if none are selected)
				for ( const item in this.implementationIds ) {
					if ( this.implementationIds[ item ].checked || this.filterState === '' ) {
						headers[ this.implementationIds[ item ].zid ] = {
							title: this.getZkeyLabels[ this.implementationIds[ item ].zid ],
							class: 'ext-wikilambda-function-details-table-text'
						};
					}
				}

				headers.state = {
					title: this.$i18n( 'wikilambda-function-implementation-state-label' ),
					class: 'ext-wikilambda-function-details-table-text'
				};

				return headers;
			},
			testersBody: function () {
				var tableData = [];
				const visibleTesters = this.testerShowAll ? this.getAllZTesters :
					this.getPaginatedTesters[ this.currentTesterPage ];
				for ( var index in visibleTesters ) {
					var testerLabel = this.getZkeyLabels[ visibleTesters[ index ] ];
					var zTesterState = this.$i18n( 'wikilambda-function-implementation-state-available' ).text();

					if ( this.getUnattachedZTesters.indexOf( visibleTesters[ index ] ) > -1 ) {
						zTesterState = this.$i18n( 'wikilambda-function-implementation-state-proposed' ).text();
					}

					tableData[ index ] = {};

					tableData[ index ].checkbox = {
						title: '',
						component: 'cdx-checkbox',
						props: {
							vModel: this.checkValue
						},
						class: 'ext-wikilambda-function-details-table-item'
					};

					tableData[ index ].name = {
						title: testerLabel,
						component: 'a',
						props: {
							href: '/wiki/' + visibleTesters[ index ]
						},
						class: 'ext-wikilambda-function-details-table-item'
					};

					for ( const item in this.implementationIds ) {
						if ( this.implementationIds[ item ].checked || this.filterState === '' ) {
							tableData[ index ][ this.implementationIds[ item ].zid ] = {
								// TODO: update to fetch actual pass/fail status and update styles/icons accordingly
								// here and in tester-table-status.vue
								component: 'tester-table-status',
								props: {
									status: this.$i18n( 'wikilambda-tester-status-passed' ).text()
								},
								class: 'ext-wikilambda-function-details-table-item--checkbox'
							};
						}
					}

					tableData[ index ].state = {
						component: 'wikilambda-chip',
						props: {
							editableContainer: false,
							readonly: true,
							text: zTesterState,
							intent: zTesterState === this.$i18n( 'wikilambda-function-implementation-state-available' ).text() ? 'success' : 'warning'
						}
					};
				}

				return tableData;
			}
		}
	),
	methods: {
		handleCheckboxClick: function ( item ) {
			// update the implementation selection
			this.implementationIds[ item ].checked = !this.implementationIds[ item ].checked;

			// if any implementation is currently checked, the filter state should be the state
			// of that implementation
			// TODO: find a more efficient way to do this
			for ( var implementation in this.implementationIds ) {
				if ( this.implementationIds[ implementation ].checked ) {
					this.filterState = this.implementationIds[ implementation ].state;
					break;
				}
				this.filterState = '';
			}
		},
		updateImplementationPage: function ( page ) {
			this.currentImplementationPage = page;
			this.implementationIds = [];
		},
		updateTestersPage: function ( page ) {
			this.currentTesterPage = page;
		},
		resetImplementationView: function () {
			this.implementationShowAll = !this.implementationShowAll;
		},
		resetTestersView: function () {
			this.testerShowAll = !this.testerShowAll;
		}
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-details {
	display: flex;
	-webkit-flex-flow: row wrap;
	flex-flow: row wrap;
	row-gap: 10px;
	column-gap: 80px;

	&__summary:extend(.ext-wikilambda-edit__text-regular) {
		color: @wmui-color-base30;
		margin-bottom: 32px;
		width: 100%;
		padding-top: 16px;
	}

	&__tables {
		flex: 1;
		flex-grow: 1;
		width: 100%;
	}

	@media screen and ( max-width: @width-breakpoint-tablet ) {
		&__sidebar {
			flex: auto;
		}
	}
}
</style>
