/*!
 * WikiLambda unit test suite for the FunctionDetails component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { CdxMessage } = require( '@wikimedia/codex' );

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	FunctionDetails = require( '../../../../resources/ext.wikilambda.edit/views/function/FunctionDetails.vue' ),
	FunctionViewerDetailsSidebar = require( '../../../../resources/ext.wikilambda.edit/views/function/details/FunctionViewerDetailsSidebar.vue' ),
	FunctionViewerDetailsTable = require( '../../../../resources/ext.wikilambda.edit/views/function/details/FunctionViewerDetailsTable.vue' );

describe( 'FunctionDetails', function () {
	var getters;
	var actions;
	var actionsThrowError;

	beforeEach( function () {
		global.window = Object.create( window );
		Object.defineProperty( window, 'location', {
			value: {
				href: 'currentPage'
			}
		} );

		actionsThrowError = false;

		var createAction = function () {
			return jest.fn( () => {
				return {
					then: function ( fn ) {
						if ( actionsThrowError ) {
							throw Object.assign( new Error(), { error: { message: 'error!' } } );
						}
						return fn( 'newPage' );
					}
				};
			} );
		};
		actions = {
			attachZImplementations: createAction(),
			detachZImplementations: createAction(),
			attachZTesters: createAction(),
			detachZTesters: createAction()
		};
		getters = {
			getZTesters: () => [ 'Z111', 'Z222' ],
			getAttachedZTesters: () => () => [ 'Z222' ],
			getZImplementations: () => [ 'Z333', 'Z444' ],
			getAttachedZImplementations: () => () => [ 'Z444' ],
			getPaginatedTesters: () => {
				return { 1: [ 'Z111', 'Z222' ] };
			},
			getPaginatedImplementations: () => {
				return { 1: [ 'Z333', 'Z444' ] };
			},
			getZkeys: () => {
				return {
					Z333: {
						[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
							[ Constants.Z_IMPLEMENTATION_BUILT_IN ]: true
						}
					},
					Z444: {
						[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
						}
					}
				};
			},
			getZkeyLabels: () => {
				return {
					Z111: 'Z111 name',
					Z222: 'Z222 name',
					Z333: 'Z333 name',
					Z444: 'Z444 name'
				};

			}
		};
		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', () => {
		var wrapper = shallowMount( FunctionDetails );
		expect( wrapper.find( '.ext-wikilambda-function-details' ).exists() ).toBe( true );
	} );

	it( 'loads child components', () => {
		var wrapper = shallowMount( FunctionDetails );
		expect( wrapper.findComponent( FunctionViewerDetailsSidebar ).exists() ).toBe( true );
		expect( wrapper.findAllComponents( FunctionViewerDetailsTable ) ).toHaveLength( 2 );
	} );

	it( 'passes implementations to table correctly', () => {
		var wrapper = shallowMount( FunctionDetails );
		const implTableItems = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 0 ].props( 'body' );

		expect( implTableItems ).toHaveLength( 2 );
		expect( implTableItems[ 0 ].checkbox.props.modelValue ).toBe( false );
		expect( implTableItems[ 0 ].language.title.string ).toEqual( 'wikilambda-implementation-selector-built-in' );
		expect( implTableItems[ 0 ].name.title ).toEqual( 'Z333 name' );
		expect( implTableItems[ 0 ].state.props.text ).toEqual( 'wikilambda-function-implementation-state-proposed' );
		expect( implTableItems[ 1 ].checkbox.props.modelValue ).toBe( false );
		expect( implTableItems[ 1 ].language.title.string ).toEqual( 'wikilambda-implementation-selector-composition' );
		expect( implTableItems[ 1 ].name.title ).toEqual( 'Z444 name' );
		expect( implTableItems[ 1 ].state.props.text ).toEqual( 'wikilambda-function-implementation-state-available' );
	} );

	it( 'passes testers to table correctly', () => {
		var wrapper = shallowMount( FunctionDetails );
		const testerTableItems = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 1 ].props( 'body' );

		expect( testerTableItems ).toHaveLength( 2 );
		expect( testerTableItems[ 0 ].checkbox.props.modelValue ).toBe( false );
		expect( testerTableItems[ 0 ].name.title ).toEqual( 'Z111 name' );
		expect( testerTableItems[ 0 ].state.props.text ).toEqual( 'wikilambda-function-implementation-state-proposed' );
		expect( testerTableItems[ 1 ].checkbox.props.modelValue ).toBe( false );
		expect( testerTableItems[ 1 ].name.title ).toEqual( 'Z222 name' );
		expect( testerTableItems[ 1 ].state.props.text ).toEqual( 'wikilambda-function-implementation-state-available' );
	} );

	describe( 'implementation select-all checkbox', () => {
		it( 'is unchecked when not all checkboxes below are checked', ( done ) => {
			var wrapper = shallowMount( FunctionDetails );
			const implTable = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 0 ];

			implTable.props( 'body' )[ 0 ].checkbox.props[ 'onUpdate:modelValue' ]( true );

			wrapper.vm.$nextTick( () => {
				expect( implTable.props( 'header' ).checkbox.props.modelValue ).toBe( false );
				done();
			} );
		} );

		it( 'is checked when all checkboxes below are checked', ( done ) => {
			var wrapper = shallowMount( FunctionDetails );
			const implTable = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 0 ];

			implTable.props( 'body' )[ 0 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
			implTable.props( 'body' )[ 1 ].checkbox.props[ 'onUpdate:modelValue' ]( true );

			wrapper.vm.$nextTick( () => {
				expect( implTable.props( 'header' ).checkbox.props.modelValue ).toBe( true );
				done();
			} );
		} );

		it( 'checks all below checkboxes when checked', ( done ) => {
			var wrapper = shallowMount( FunctionDetails );
			const implTable = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 0 ];

			implTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );

			wrapper.vm.$nextTick( () => {
				expect( implTable.props( 'body' )[ 0 ].checkbox.props.modelValue ).toBe( true );
				expect( implTable.props( 'body' )[ 1 ].checkbox.props.modelValue ).toBe( true );
				done();
			} );
		} );

		it( 'unchecks all below checkboxes when unchecked', ( done ) => {
			var wrapper = shallowMount( FunctionDetails );
			const implTable = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 0 ];
			implTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );
			implTable.props( 'body' )[ 0 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
			implTable.props( 'body' )[ 1 ].checkbox.props[ 'onUpdate:modelValue' ]( true );

			wrapper.vm.$nextTick( () => {
				implTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( false );

				wrapper.vm.$nextTick( () => {
					expect( implTable.props( 'body' )[ 0 ].checkbox.props.modelValue ).toBe( false );
					expect( implTable.props( 'body' )[ 1 ].checkbox.props.modelValue ).toBe( false );
					done();
				} );
			} );
		} );
	} );

	describe( 'tester select-all checkbox', () => {
		it( 'is unchecked when not all checkboxes below are checked', ( done ) => {
			var wrapper = shallowMount( FunctionDetails );
			const testerTable = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 1 ];

			testerTable.props( 'body' )[ 0 ].checkbox.props[ 'onUpdate:modelValue' ]( true );

			wrapper.vm.$nextTick( () => {
				expect( testerTable.props( 'header' ).checkbox.props.modelValue ).toBe( false );
				done();
			} );
		} );

		it( 'is checked when all checkboxes below are checked', ( done ) => {
			var wrapper = shallowMount( FunctionDetails );
			const testerTable = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 1 ];

			testerTable.props( 'body' )[ 0 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
			testerTable.props( 'body' )[ 1 ].checkbox.props[ 'onUpdate:modelValue' ]( true );

			wrapper.vm.$nextTick( () => {
				expect( testerTable.props( 'header' ).checkbox.props.modelValue ).toBe( true );
				done();
			} );
		} );

		it( 'checks all below checkboxes when checked', ( done ) => {
			var wrapper = shallowMount( FunctionDetails );
			const testerTable = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 1 ];

			testerTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );

			wrapper.vm.$nextTick( () => {
				expect( testerTable.props( 'body' )[ 0 ].checkbox.props.modelValue ).toBe( true );
				expect( testerTable.props( 'body' )[ 1 ].checkbox.props.modelValue ).toBe( true );
				done();
			} );
		} );

		it( 'unchecks all below checkboxes when unchecked', ( done ) => {
			var wrapper = shallowMount( FunctionDetails );
			const testerTable = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 1 ];
			testerTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );
			testerTable.props( 'body' )[ 0 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
			testerTable.props( 'body' )[ 1 ].checkbox.props[ 'onUpdate:modelValue' ]( true );

			wrapper.vm.$nextTick( () => {
				testerTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( false );

				wrapper.vm.$nextTick( () => {
					expect( testerTable.props( 'body' )[ 0 ].checkbox.props.modelValue ).toBe( false );
					expect( testerTable.props( 'body' )[ 1 ].checkbox.props.modelValue ).toBe( false );
					done();
				} );
			} );
		} );
	} );

	describe( 'approve & deactivate buttons', () => {
		it( 'attach checked implementation and load returned page, without error toast', ( done ) => {
			var wrapper = shallowMount( FunctionDetails, { props: { zobjectId: 123 } } );
			const implTable = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 0 ];
			implTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );

			implTable.vm.$emit( 'approve' );

			wrapper.vm.$nextTick( () => {
				expect( actions.attachZImplementations ).toHaveBeenCalledWith( expect.anything(), {
					functionId: 123,
					implementationZIds: [ 'Z333' ]
				} );
				expect( window.location.href ).toEqual( 'newPage' );
				expect( wrapper.findComponent( CdxMessage ).exists() ).toBe( false );
				done();
			} );
		} );

		it( 'detach checked implementation and load returned page, without error toast', ( done ) => {
			var wrapper = shallowMount( FunctionDetails, { props: { zobjectId: 123 } } );
			const implTable = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 0 ];
			implTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );

			implTable.vm.$emit( 'deactivate' );

			wrapper.vm.$nextTick( () => {
				expect( actions.detachZImplementations ).toHaveBeenCalledWith( expect.anything(), {
					functionId: 123,
					implementationZIds: [ 'Z444' ]
				} );
				expect( window.location.href ).toEqual( 'newPage' );
				expect( wrapper.findComponent( CdxMessage ).exists() ).toBe( false );
				done();
			} );
		} );

		it( 'attach checked tester and load returned page, without error toast', ( done ) => {
			var wrapper = shallowMount( FunctionDetails, { props: { zobjectId: 123 } } );
			const testerTable = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 1 ];
			testerTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );

			testerTable.vm.$emit( 'approve' );

			wrapper.vm.$nextTick( () => {
				expect( actions.attachZTesters ).toHaveBeenCalledWith( expect.anything(), {
					functionId: 123,
					testerZIds: [ 'Z111' ]
				} );
				expect( window.location.href ).toEqual( 'newPage' );
				expect( wrapper.findComponent( CdxMessage ).exists() ).toBe( false );
				done();
			} );
		} );

		it( 'detach checked tester and load returned page, without error toast', ( done ) => {
			var wrapper = shallowMount( FunctionDetails, { props: { zobjectId: 123 } } );
			const testerTable = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 1 ];
			testerTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );

			testerTable.vm.$emit( 'deactivate' );

			wrapper.vm.$nextTick( () => {
				expect( actions.detachZTesters ).toHaveBeenCalledWith( expect.anything(), {
					functionId: 123,
					testerZIds: [ 'Z222' ]
				} );
				expect( window.location.href ).toEqual( 'newPage' );
				expect( wrapper.findComponent( CdxMessage ).exists() ).toBe( false );
				done();
			} );
		} );

		it( 'show error toast when an operation fails', ( done ) => {
			var wrapper = shallowMount( FunctionDetails, { props: { zobjectId: 123 } } );
			const testerTable = wrapper.findAllComponents( FunctionViewerDetailsTable )[ 1 ];
			testerTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );

			actionsThrowError = true;
			testerTable.vm.$emit( 'deactivate' );

			wrapper.vm.$nextTick( () => {
				// Wait for 1s to ensure error has been handled. Waiting for `nextTick` does not seem to be sufficient.
				setTimeout( () => {
					expect( wrapper.findComponent( CdxMessage ).exists() ).toBe( true );
					expect( wrapper.findComponent( CdxMessage ).props( 'type' ) ).toEqual( 'error' );
					done();
				}, 1000 );
			} );
		} );
	} );
} );
