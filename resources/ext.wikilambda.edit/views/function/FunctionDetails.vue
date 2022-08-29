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
				:can-approve="areProposedImplementationsSelected"
				:can-deactivate="areAvailableImplementationsSelected"
				@update-page="updateImplementationPage"
				@reset-view="resetImplementationView"
				@approve="approveImplementations"
				@deactivate="deactivateImplementations"
			></function-viewer-details-table>
			<function-viewer-details-table
				:header="testersHeader"
				:body="testersBody"
				:title="$i18n( 'wikilambda-function-test-cases-table-header' ).text()"
				:current-page="currentTesterPage"
				:total-pages="numberofTesterPages"
				:showing-all="testerShowAll"
				:can-approve="areProposedTestersSelected"
				:can-deactivate="areAvailableTestersSelected"
				@update-page="updateTestersPage"
				@reset-view="resetTestersView"
				@approve="approveTesters"
				@deactivate="deactivateTesters"
			></function-viewer-details-table>
		</section>
		<cdx-message
			v-if="shouldShowToast"
			:dismiss-button-label="$i18n( 'wikilambda-toast-close' ).text()"
			type="error"
			@user-dismissed="closeToast"
		>
			{{ currentToast }}
		</cdx-message>
	</main>
</template>

<script>
var Vue = require( 'vue' );
var FunctionViewerDetailsSidebar = require( './details/FunctionViewerDetailsSidebar.vue' ),
	FunctionViewerDetailsImplementationTable = require( './details/FunctionViewerDetailsTable.vue' ),
	Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	CdxCheckbox = require( '@wikimedia/codex' ).CdxCheckbox,
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	WikilambdaChip = require( '../../components/base/Chip.vue' ),
	TableTesterStatus = require( './partials/TesterTableStatus.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

Vue.component( 'cdx-checkbox', CdxCheckbox.default || CdxCheckbox );
Vue.component( 'wikilambda-chip', WikilambdaChip.default || WikilambdaChip );
Vue.component( 'tester-table-status', TableTesterStatus.default || TableTesterStatus );

// @vue/component
module.exports = exports = {
	name: 'function-details',
	components: {
		'function-viewer-details-sidebar': FunctionViewerDetailsSidebar,
		'function-viewer-details-table': FunctionViewerDetailsImplementationTable,
		'cdx-message': CdxMessage
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
			currentImplementationPage: 1,
			implementationShowAll: false,
			currentTesterPage: 1,
			testerShowAll: false,
			implZidToState: {},
			testerZidToState: {},
			currentToast: null
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
							modelValue: Object.keys( this.implZidToState ).every( ( zid ) =>
								this.implZidToState[ zid ].checked ),
							'onUpdate:modelValue': function ( newValue ) {
								for ( const zid in this.implZidToState ) {
									this.implZidToState[ zid ].checked = newValue;
								}
							}.bind( this )
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
				for ( const index in visibleImplementations ) {
					var isAvailable = !this.isFunctionItemUnattached(
						visibleImplementations[ index ],
						this.getUnattachedZImplementations
					);

					// get the language of the implementation
					var language = this.$i18n( 'wikilambda-implementation-selector-composition' );
					var zImplementationObj = this.getZkeys[ visibleImplementations[ index ] ];
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

					// for each implementation, store whether its checkbox is checked and whether it's available. We use
					// this to determine the state of the select-all checkbox, the columns of the test table, and
					// whether the approve and deactivate buttons should be enabled.
					if ( !this.implZidToState[ visibleImplementations[ index ] ] ) {
						this.implZidToState[ visibleImplementations[ index ] ] = {
							available: isAvailable,
							checked: false
						};
					}

					// create the table data for the implementations table
					tableData.push( {
						checkbox: {
							title: '',
							component: 'cdx-checkbox',
							props: {
								modelValue: this.implZidToState[ visibleImplementations[ index ] ].checked,
								'onUpdate:modelValue': function ( newValue ) {
									this.implZidToState[ visibleImplementations[ index ] ].checked = newValue;
								}.bind( this )
							},
							class: 'ext-wikilambda-function-details-table-item',
							id: this.getZkeyLabels[ visibleImplementations[ index ] ]
						},
						name: {
							title: this.getZkeyLabels[ visibleImplementations[ index ] ],
							component: 'a',
							props: {
								href: '/wiki/' + visibleImplementations[ index ]
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
								text: this.$i18n(
									isAvailable ?
										'wikilambda-function-implementation-state-available' :
										'wikilambda-function-implementation-state-proposed'
								).text(),
								intent: isAvailable ? 'success' : 'warning'
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
							modelValue: Object.keys( this.testerZidToState ).every( ( zid ) =>
								this.testerZidToState[ zid ].checked ),
							'onUpdate:modelValue': function ( newValue ) {
								for ( const zid in this.testerZidToState ) {
									this.testerZidToState[ zid ].checked = newValue;
								}
							}.bind( this )
						},
						class: 'ext-wikilambda-function-details-table-text'
					},
					name: {
						title: this.$i18n( 'wikilambda-function-implementation-name-label' ),
						class: 'ext-wikilambda-function-details-table-text'
					}
				};

				// create one column per implementation selected (or for all implementations if none are selected)
				for ( const zid in this.implZidToState ) {
					if ( this.implZidToState[ zid ].checked || !this.areAnyImplementationsChecked ) {
						headers[ zid ] = {
							title: this.getZkeyLabels[ zid ],
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
				for ( const index in visibleTesters ) {
					var testerLabel = this.getZkeyLabels[ visibleTesters[ index ] ];
					var isAvailable = !this.isFunctionItemUnattached(
						visibleTesters[ index ],
						this.getUnattachedZTesters
					);

					// for each tester, store whether its checkbox is checked and whether it's available. We use this
					// to determine  the state of the select-all checkbox, and whether the approve and deactivate
					// buttons should be enabled.
					if ( !this.testerZidToState[ visibleTesters[ index ] ] ) {
						this.testerZidToState[ visibleTesters[ index ] ] = {
							available: isAvailable,
							checked: false
						};
					}

					tableData[ index ] = {};

					tableData[ index ].checkbox = {
						title: '',
						component: 'cdx-checkbox',
						props: {
							modelValue: this.testerZidToState[ visibleTesters[ index ] ].checked,
							'onUpdate:modelValue': function ( newValue ) {
								this.testerZidToState[ visibleTesters[ index ] ].checked = newValue;
							}.bind( this )
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

					for ( const zid in this.implZidToState ) {
						if ( this.implZidToState[ zid ].checked || !this.areAnyImplementationsChecked ) {
							tableData[ index ][ zid ] = {
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
							text: this.$i18n(
								isAvailable ?
									'wikilambda-function-implementation-state-available' :
									'wikilambda-function-implementation-state-proposed'
							).text(),
							intent: isAvailable ? 'success' : 'warning'
						}
					};
				}

				return tableData;
			},
			areAnyImplementationsChecked: function () {
				return Object.keys( this.implZidToState ).some( ( zid ) => this.implZidToState[ zid ].checked );
			},
			areProposedImplementationsSelected: function () {
				return Object.keys( this.implZidToState ).some( ( zid ) =>
					this.implZidToState[ zid ].checked && !this.implZidToState[ zid ].available );
			},
			areAvailableImplementationsSelected: function () {
				return Object.keys( this.implZidToState ).some( ( zid ) =>
					this.implZidToState[ zid ].checked && this.implZidToState[ zid ].available );
			},
			areProposedTestersSelected: function () {
				return Object.keys( this.testerZidToState ).some( ( zid ) =>
					this.testerZidToState[ zid ].checked && !this.testerZidToState[ zid ].available );
			},
			areAvailableTestersSelected: function () {
				return Object.keys( this.testerZidToState ).some( ( zid ) =>
					this.testerZidToState[ zid ].checked && this.testerZidToState[ zid ].available );
			},
			shouldShowToast: function () {
				return this.currentToast !== null;
			}
		}
	),
	methods: $.extend( mapActions( [
		'attachZImplementations',
		'detachZImplementations',
		'attachZTesters',
		'detachZTesters'
	] ), {
		updateImplementationPage: function ( page ) {
			this.currentImplementationPage = page;
			this.implZidToState = {};
		},
		updateTestersPage: function ( page ) {
			this.currentTesterPage = page;
			this.testerZidToState = {};
		},
		resetImplementationView: function () {
			this.implementationShowAll = !this.implementationShowAll;
		},
		resetTestersView: function () {
			this.testerShowAll = !this.testerShowAll;
		},
		approveImplementations: function () {
			// TODO(T316566): ensure only those with the correct permissions can approve/deactivate
			const zidsToAttach = Object.keys( this.implZidToState ).filter( ( zid ) =>
				this.implZidToState[ zid ].checked && !this.implZidToState[ zid ].available );
			const context = this;
			this.attachZImplementations( {
				functionId: this.zobjectId,
				implementationZIds: zidsToAttach
			} ).then( function ( pageTitle ) {
				if ( pageTitle ) {
					window.location.href = new mw.Title( pageTitle ).getUrl();
				}
			} ).catch( function ( error ) {
				context.currentToast = error.error.message;
			} );
		},
		deactivateImplementations: function () {
			const zidsToDetach = Object.keys( this.implZidToState ).filter( ( zid ) =>
				this.implZidToState[ zid ].checked && this.implZidToState[ zid ].available );
			const context = this;
			this.detachZImplementations( {
				functionId: this.zobjectId,
				implementationZIds: zidsToDetach
			} ).then( function ( pageTitle ) {
				if ( pageTitle ) {
					window.location.href = new mw.Title( pageTitle ).getUrl();
				}
			} ).catch( function ( error ) {
				context.currentToast = error.error.message;
			} );
		},
		approveTesters: function () {
			const zidsToAttach = Object.keys( this.testerZidToState ).filter( ( zid ) =>
				this.testerZidToState[ zid ].checked && !this.testerZidToState[ zid ].available );
			const context = this;
			this.attachZTesters( {
				functionId: this.zobjectId,
				testerZIds: zidsToAttach
			} ).then( function ( pageTitle ) {
				if ( pageTitle ) {
					window.location.href = new mw.Title( pageTitle ).getUrl();
				}
			} ).catch( function ( error ) {
				context.currentToast = error.error.message;
			} );
		},
		deactivateTesters: function () {
			const zidsToDetach = Object.keys( this.testerZidToState ).filter( ( zid ) =>
				this.testerZidToState[ zid ].checked && this.testerZidToState[ zid ].available );
			const context = this;
			this.detachZTesters( {
				functionId: this.zobjectId,
				testerZIds: zidsToDetach
			} ).then( function ( pageTitle ) {
				if ( pageTitle ) {
					window.location.href = new mw.Title( pageTitle ).getUrl();
				}
			} ).catch( function ( error ) {
				context.currentToast = error.error.message;
			} );
		},
		closeToast: function () {
			this.currentToast = null;
		}
	} )
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
