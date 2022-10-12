/*!
 * WikiLambda unit test suite for the ZTesterImplResult component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	ZFunctionTesterReport = require( '../../../../resources/ext.wikilambda.edit/components/function/ZFunctionTesterReport.vue' );

describe( 'ZFunctionTesterReport', function () {
	var fetchZKeysMock = jest.fn(),
		getTestResultsMock = jest.fn();
	beforeEach( function () {
		global.store.hotUpdate( {
			getters: {
				getZObjectChildrenById: jest.fn(),
				getZkeyLabels: jest.fn( function () {
					return {
						Z10000: 'FN',
						Z10001: 'IMPL',
						Z10002: 'TESTER'
					};
				} ),
				getZkeys: jest.fn( function () {
					return {
						Z10000: 'Z10000',
						Z10001: 'Z10001',
						Z10002: 'Z10002'
					};
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
				getZTesterResults: jest.fn( function () {
					return jest.fn();
				} )
			},
			actions: {
				fetchZKeys: fetchZKeysMock,
				getTestResults: getTestResultsMock
			}
		} );

		jest.clearAllMocks();
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
		expect( wrapper.find( 'p' ).text() ).toBe( 'wikilambda-tester-no-results' );
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
