/*!
 * WikiLambda unit test suite for the ZTesterImplResult component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
var VueTestUtils = require( '@vue/test-utils' ),
	FunctionReport = require( '../../../../resources/ext.wikilambda.edit/components/widgets/FunctionReport.vue' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'FunctionReport', function () {
	var fetchZKeysMock = jest.fn( function () {
			return true;
		} ),
		getTestResultsMock = jest.fn(),
		getters;

	beforeEach( function () {
		getters = {
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
			getZTesterPercentage: jest.fn( function () {
				return function () {
					return {
						passing: 1,
						total: 1,
						percentage: 100
					};
				};
			} ),
			getFetchingTestResults: jest.fn( function () {
				return false;
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
		var wrapper = VueTestUtils.mount( FunctionReport, {
			props: {
				zFunctionId: ''
			}
		} );
		expect( wrapper.find( 'div' ).exists() ).toBeTruthy();
	} );

	it( 'triggers the tests on load', function () {
		VueTestUtils.mount( FunctionReport, {
			props: {
				zFunctionId: ''
			}
		} );

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
		var wrapper = VueTestUtils.mount( FunctionReport, {
			props: {
				zFunctionId: ''
			}
		} );
		expect( wrapper.find( 'p' ).text() )
			.toBe( 'No test results found. Please add an implementation and a test to see results.' );
	} );

	it( 'displays all available testers if a new zImplementation is being created', async function () {
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

		var wrapper = VueTestUtils.mount( FunctionReport, {
			props: {
				zFunctionId: 'Z10000',
				zImplementationId: Constants.NEW_ZID_PLACEHOLDER,
				reportType: Constants.Z_IMPLEMENTATION
			}
		} );

		expect( wrapper.vm.zIds ).toEqual( [ 'Z10002', 'Z10003' ] );

		var content = wrapper.findAll( '.ext-wikilambda-function-report__result' );
		expect( content.length ).toBe( 2 );

	} );

	it( 'displays all available implementations if a new zTester is being created', async function () {
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

		var wrapper = VueTestUtils.mount( FunctionReport, {
			props: {
				zFunctionId: 'Z10000',
				zTesterId: Constants.NEW_ZID_PLACEHOLDER,
				reportType: Constants.Z_TESTER
			}
		} );

		expect( wrapper.vm.zIds ).toEqual( [ 'Z10001', 'Z10004', 'Z10005' ] );
		expect( wrapper.find( '.ext-wikilambda-widget-base-header-slot' ).text() ).toEqual( 'Implementations' );

		var content = wrapper.findAll( '.ext-wikilambda-function-report__result' );
		expect( content.length ).toBe( 3 );

	} );

	it( 'if displayed on a ZImplementation page, only shows testers', function () {
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

		var wrapper = VueTestUtils.mount( FunctionReport, {
			props: {
				zFunctionId: 'Z10000',
				zImplementationId: 'Z10001',
				reportType: Constants.Z_IMPLEMENTATION
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-widget-base-header-slot' ).text() ).toEqual( 'Test cases' );
		expect( wrapper.vm.zIds ).toEqual( [ 'Z10002', 'Z10003' ] );

	} );

	it( 'if displayed on a ZTester page, only shows ZImplementations', function () {
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

		var wrapper = VueTestUtils.mount( FunctionReport, {
			props: {
				zFunctionId: 'Z10000',
				zTesterId: 'Z10002',
				reportType: Constants.Z_TESTER
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-widget-base-header-slot' ).text() ).toEqual( 'Implementations' );
		expect( wrapper.vm.zIds ).toEqual( [ 'Z10001', 'Z10004', 'Z10005' ] );

	} );

	// TODO (T303072): This test is skipped because overriding computed properties is no longer
	// supported by vue-test-utils
	it.skip( 'triggers the tests on button click', function () {
		var expectedImplementationId = 'Z10001',
			expectedTesterId = 'Z10002',
			wrapper = VueTestUtils.mount( FunctionReport, {
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
