/*!
 * WikiLambda unit test suite for the ZTesterImplResult component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var mount = require( '@vue/test-utils' ).mount,
	Vuex = require( 'vuex' ),
	ZTesterImplResult = require( '../../../../resources/ext.wikilambda.edit/components/function/ZTesterImplResult.vue' );

describe( 'ZTesterImplResult', function () {
	var getters,
		store,
		testStatus,
		zFunctionId,
		zImplementationId,
		zTesterId,
		$i18n = jest.fn( function ( str ) {
			return str;
		} ),
		returnStatus = jest.fn( function () {
			return testStatus;
		} );

	beforeEach( function () {
		zFunctionId = 'Z10000';
		zImplementationId = 'Z10001';
		zTesterId = 'Z10002';

		getters = {
			getZTesterResults: jest.fn( function () {
				return returnStatus;
			} )
		};

		store = Vuex.createStore( {
			getters: getters
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = mount( ZTesterImplResult, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId
			},
			global: {
				plugins: [
					store
				],
				mocks: {
					$i18n: $i18n
				}
			}
		} );
		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );

	it( 'fetches the test result for the provided IDs from Vuex', function () {
		mount( ZTesterImplResult, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId
			},
			global: {
				plugins: [
					store
				],
				mocks: {
					$i18n: $i18n
				}
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
			},
			global: {
				plugins: [
					store
				],
				mocks: {
					$i18n: $i18n
				}
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-tester-result' ).text() ).toBe( 'wikilambda-tester-status-running' );
	} );

	it( 'displays passed status when result is passed', function () {
		testStatus = true;
		var wrapper = mount( ZTesterImplResult, {
			global: {
				plugins: [
					store
				],
				mocks: {
					$i18n: $i18n
				}
			},
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-tester-result' ).text() ).toBe( 'wikilambda-tester-status-passed' );
	} );

	it( 'displays failed status when result is failed', function () {
		testStatus = false;
		var wrapper = mount( ZTesterImplResult, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId
			},
			global: {
				plugins: [
					store
				],
				mocks: {
					$i18n: $i18n
				}
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-tester-result' ).text() ).toBe( 'wikilambda-tester-status-failed' );
	} );

	it( 'displays pending status when implementation missing', function () {
		testStatus = undefined;
		var wrapper = mount( ZTesterImplResult, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: '',
				zTesterId: zTesterId
			},
			global: {
				plugins: [
					store
				],
				mocks: {
					$i18n: $i18n
				}
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-tester-result' ).text() ).toBe( 'wikilambda-tester-status-pending' );
	} );

	it( 'displays pending status when tester missing', function () {
		testStatus = undefined;
		var wrapper = mount( ZTesterImplResult, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: ''
			},
			global: {
				plugins: [
					store
				],
				mocks: {
					$i18n: $i18n
				}
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-tester-result' ).text() ).toBe( 'wikilambda-tester-status-pending' );
	} );
} );
