/*!
 * WikiLambda unit test suite for the ZTesterImplResult component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
var VueTestUtils = require( '@vue/test-utils' ),
	ZFunctionTesterReport = require( '../../../../resources/ext.wikilambda.edit/components/function/ZFunctionTesterReport.vue' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'ZFunctionTesterReport', function () {
	var fetchZKeysMock = jest.fn( function () {
			return true;
		} ),
		getTestResultsMock = jest.fn(),
		getters;

	beforeEach( function () {
		getters = {
			getZObjectChildrenById: jest.fn(),
			getZkeyLabels: jest.fn( function () {
				return {
					Z10000: 'FN',
					Z10001: 'IMPL',
					Z10002: 'TESTER',
					Z10004: 'IMPL2'
				};
			} ),
			getZkeys: jest.fn( function () {
				return {};
			} ),
			getViewMode: jest.fn( function () {
				return false;
			} ),
			getNestedZObjectById: jest.fn(),
			getZObjectAsJsonById: jest.fn(),
			getZTesterPercentage: jest.fn( function () {
				return function () {
					return {
						passing: 1,
						total: 1,
						percentage: 100
					};
				};
			} ),
			getCurrentZObjectId: jest.fn(),
			getZTesters: jest.fn( function () {
				return [ 'Z10002', 'Z10003' ];
			} ),
			getZImplementations: jest.fn( function () {
				return [ 'Z10001', 'Z10004', 'Z10005' ];
			} )
		};
		global.store.hotUpdate( {
			getters: getters,
			actions: {
				fetchZKeys: fetchZKeysMock,
				getTestResults: getTestResultsMock
			}
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( ZFunctionTesterReport, {
			props: {
				zFunctionId: ''
			}
		} );
		expect( wrapper.find( 'div' ).exists() ).toBeTruthy();
	} );

	it( 'triggers the tests on load', function () {
		VueTestUtils.shallowMount( ZFunctionTesterReport, {
			props: {
				zFunctionId: ''
			}
		} );

		// eslint-disable-next-line compat/compat
		return new Promise( function ( resolve ) {
			setTimeout( function () {
				expect( getTestResultsMock ).toHaveBeenCalled();
				expect( getTestResultsMock ).toHaveBeenCalledWith( expect.anything(), {
					zFunctionId: '',
					zImplementations: [],
					zTesters: [],
					clearPreviousResults: true
				} );

				resolve();
			}, 1500 );
		} );
	} );

	it( 'displays no results when no implementations or testers found', function () {
		var wrapper = VueTestUtils.shallowMount( ZFunctionTesterReport, {
			props: {
				zFunctionId: ''
			}
		} );
		expect( wrapper.find( 'p' ).text() )
			.toBe( 'No test results found. Please add an implementation and a test to see results.' );
	} );

	it( 'displays "current implementation" and all available testers if a new zImplementation is being created', async function () {
		getters.getCurrentZObjectId = jest.fn( function () {
			return Constants.NEW_ZID_PLACEHOLDER;
		} );

		getters.getZkeys = jest.fn( function () {
			return {
				Z10001: {
					[ Constants.Z_PERSISTENTOBJECT_VALUE ]:
						{ [ Constants.Z_OBJECT_TYPE ]: Constants.Z_IMPLEMENTATION }
				},
				Z10000: {
					[ Constants.Z_PERSISTENTOBJECT_VALUE ]:
						{ [ Constants.Z_FUNCTION_TESTERS ]: [ Constants.Z_TESTER, 'Z10002', 'Z10003' ],
							[ Constants.Z_FUNCTION_IMPLEMENTATIONS ]: [ Constants.Z_IMPLEMENTATION, 'Z10001', 'Z10004', 'Z10005' ] }
				}
			};
		} );

		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = VueTestUtils.shallowMount( ZFunctionTesterReport, {
			props: {
				zFunctionId: 'Z10000',
				zImplementationId: Constants.NEW_ZID_PLACEHOLDER
			}
		} );

		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__header-cell' ).length ).toBe( 1 );
		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__header-cell' )[ 0 ].text() ).toBe( 'Current implementation' );

		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__row' ).length ).toBe( 2 );
		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__row' )[ 0 ].text() ).toBe( 'TESTER' );
		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__row' )[ 1 ].text() ).toBe( 'Z10003' );
	} );

	it( 'displays "current tester" and all available implementations if a new zTester is being created', async function () {
		getters.getCurrentZObjectId = jest.fn( function () {
			return Constants.NEW_ZID_PLACEHOLDER;
		} );

		getters.getZkeys = jest.fn( function () {
			return {
				Z10001: {
					[ Constants.Z_PERSISTENTOBJECT_VALUE ]:
						{ [ Constants.Z_OBJECT_TYPE ]: Constants.Z_TESTER }
				},
				Z10000: {
					[ Constants.Z_PERSISTENTOBJECT_VALUE ]:
						{ [ Constants.Z_FUNCTION_TESTERS ]: [ Constants.Z_TESTER, 'Z10002', 'Z10003' ],
							[ Constants.Z_FUNCTION_IMPLEMENTATIONS ]: [ Constants.Z_IMPLEMENTATION, 'Z10001', 'Z10004', 'Z10005' ] }
				}
			};
		} );

		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = VueTestUtils.shallowMount( ZFunctionTesterReport, {
			props: {
				zFunctionId: 'Z10000',
				zTesterId: Constants.NEW_ZID_PLACEHOLDER
			}
		} );

		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__row' ).length ).toBe( 1 );
		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__row' )[ 0 ].text() ).toBe( 'Current test' );

		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__header-cell' ).length ).toBe( 3 );
		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__header-cell' )[ 0 ].text() ).toBe( 'IMPL' );
		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__header-cell' )[ 1 ].text() ).toBe( 'IMPL2' );
		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__header-cell' )[ 2 ].text() ).toBe( 'Z10005' );
	} );

	it( 'if displayed on a ZImplementation page, only shows that ZImplementation as current implementation', function () {
		getters.getCurrentZObjectId = jest.fn( function () {
			return 'Z10001';
		} );

		getters.getZkeys = jest.fn( function () {
			return {
				Z10001: {
					[ Constants.Z_PERSISTENTOBJECT_VALUE ]:
						{ [ Constants.Z_OBJECT_TYPE ]: Constants.Z_IMPLEMENTATION }
				},
				Z10000: {
					[ Constants.Z_PERSISTENTOBJECT_VALUE ]:
						{ [ Constants.Z_FUNCTION_TESTERS ]: [ Constants.Z_TESTER, 'Z10002', 'Z10003' ],
							[ Constants.Z_FUNCTION_IMPLEMENTATIONS ]: [ Constants.Z_IMPLEMENTATION, 'Z10001', 'Z10004', 'Z10005' ] }
				}
			};
		} );

		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = VueTestUtils.shallowMount( ZFunctionTesterReport, {
			props: {
				zFunctionId: 'Z10000',
				zImplementationId: 'Z10001'
			}
		} );

		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__header-cell' ).length ).toBe( 1 );
		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__header-cell' )[ 0 ].text() ).toBe( 'Current implementation' );

		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__row' ).length ).toBe( 2 );
		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__row' )[ 0 ].text() ).toBe( 'TESTER' );
		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__row' )[ 1 ].text() ).toBe( 'Z10003' );
	} );

	it( 'if displayed on a ZTester page, only shows that ZTester as current test', function () {
		getters.getCurrentZObjectId = jest.fn( function () {
			return 'Z10002';
		} );

		getters.getZkeys = jest.fn( function () {
			return {
				Z10002: {
					[ Constants.Z_PERSISTENTOBJECT_VALUE ]:
						{ [ Constants.Z_OBJECT_TYPE ]: Constants.Z_TESTER }
				},
				Z10000: {
					[ Constants.Z_PERSISTENTOBJECT_VALUE ]:
						{ [ Constants.Z_FUNCTION_TESTERS ]: [ Constants.Z_TESTER, 'Z10002', 'Z10006' ],
							[ Constants.Z_FUNCTION_IMPLEMENTATIONS ]: [ Constants.Z_IMPLEMENTATION, 'Z10001', 'Z10004', 'Z10005' ] }
				}
			};
		} );

		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = VueTestUtils.shallowMount( ZFunctionTesterReport, {
			props: {
				zFunctionId: 'Z10000',
				zTesterId: 'Z10002'
			}
		} );

		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__row' ).length ).toBe( 1 );
		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__row' )[ 0 ].text() ).toBe( 'Current test' );

		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__header-cell' ).length ).toBe( 3 );
		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__header-cell' )[ 0 ].text() ).toBe( 'IMPL' );
		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__header-cell' )[ 1 ].text() ).toBe( 'IMPL2' );
		expect( wrapper.findAll( '.ext-wikilambda-fn-tester-results__header-cell' )[ 2 ].text() ).toBe( 'Z10005' );
	} );

	// TODO (T303072): This test is skipped because overriding computed properties is no longer
	// supported by vue-test-utils
	it.skip( 'triggers the tests on button click', function () {
		var expectedImplementationId = 'Z10001',
			expectedTesterId = 'Z10002',
			wrapper = VueTestUtils.shallowMount( ZFunctionTesterReport, {
				props: {
					zFunctionId: 'Z10000',
					zImplementationId: expectedImplementationId,
					zTesterId: expectedTesterId
				},
				// TODO (T303072): This is not supported any more
				computed: {
					implementations: jest.fn().mockReturnValue( [ expectedImplementationId ] ),
					testers: jest.fn().mockReturnValue( [ expectedTesterId ] )
				}
			} );

		return wrapper.find( 'button' ).trigger( 'click' ).then( function () {
			expect( getTestResultsMock ).toHaveBeenCalledWith( expect.anything(), {
				zFunctionId: 'Z10000',
				zImplementations: [ 'Z10001' ],
				zTesters: [ 'Z10002' ],
				clearPreviousResults: true
			} );
		} );
	} );
} );
