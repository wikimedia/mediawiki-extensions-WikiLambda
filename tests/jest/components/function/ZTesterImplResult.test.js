/*!
 * WikiLambda unit test suite for the ZTesterImplResult component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var mount = require( '@vue/test-utils' ).mount,
	ZTesterImplResult = require( '../../../../resources/ext.wikilambda.edit/components/function/ZTesterImplResult.vue' );

describe( 'ZTesterImplResult', function () {
	var testStatus,
		zFunctionId,
		zImplementationId,
		zTesterId,
		returnStatus = jest.fn( function () {
			return testStatus;
		} );

	beforeEach( function () {
		zFunctionId = 'Z10000';
		zImplementationId = 'Z10001';
		zTesterId = 'Z10002';

		global.store.hotUpdate( {
			getters: {
				getZTesterResults: jest.fn( function () {
					return returnStatus;
				} )
			}
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = mount( ZTesterImplResult, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-tester-result' ).exists() ).toBeTruthy();
	} );

	it( 'fetches the test result for the provided IDs from Vuex', function () {
		mount( ZTesterImplResult, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId
			}
		} );
		expect( returnStatus ).toHaveBeenCalledWith( zFunctionId, zTesterId, zImplementationId );
	} );

	it( 'displays running status when no result found', function () {
		testStatus = undefined;
		var wrapper = mount( ZTesterImplResult, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-tester-result' ).text() ).toBe( 'Running...' );
	} );

	it( 'displays passed status when result is passed', function () {
		testStatus = true;
		var wrapper = mount( ZTesterImplResult, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-tester-result' ).text() ).toBe( 'Pass' );
	} );

	it( 'displays failed status when result is failed', function () {
		testStatus = false;
		var wrapper = mount( ZTesterImplResult, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-tester-result' ).text() ).toBe( 'Fail' );
	} );

	it( 'displays pending status when implementation missing', function () {
		testStatus = undefined;
		var wrapper = mount( ZTesterImplResult, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: '',
				zTesterId: zTesterId
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-tester-result' ).text() ).toBe( 'Pending...' );
	} );

	it( 'displays pending status when tester missing', function () {
		testStatus = undefined;
		var wrapper = mount( ZTesterImplResult, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: ''
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-tester-result' ).text() ).toBe( 'Pending...' );
	} );
} );
