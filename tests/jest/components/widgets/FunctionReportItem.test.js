/*!
 * WikiLambda unit test suite for the FunctionReportItem component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	FunctionReportItem = require( '../../../../resources/ext.wikilambda.edit/components/widgets/FunctionReportItem.vue' );

describe( 'FunctionReportItem', function () {
	var testStatus,
		zFunctionId,
		zImplementationId,
		zTesterId,
		reportType,
		returnStatus = jest.fn( function () {
			return testStatus;
		} );

	beforeEach( function () {
		zFunctionId = 'Z10000';
		zImplementationId = 'Z10001';
		zTesterId = 'Z10002';
		reportType = Constants.Z_TESTER;

		global.store.hotUpdate( {
			getters: {
				getZTesterResults: jest.fn( function () {
					return returnStatus;
				} ),
				getZkeyLabels: createGettersWithFunctionsMock()
			}
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId,
				reportType: reportType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-report-item' ).exists() ).toBeTruthy();
	} );

	it( 'fetches the test result for the provided IDs from Vuex', function () {
		mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId,
				reportType: reportType
			}
		} );
		expect( returnStatus ).toHaveBeenCalledWith( zFunctionId, zTesterId, zImplementationId );
	} );

	it( 'displays running status when no result found', function () {
		testStatus = undefined;
		var wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId,
				reportType: reportType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-report-item__footer-status' ).text() ).toBe( 'Running…' );
	} );

	it( 'displays passed status when result is passed', function () {
		testStatus = true;
		var wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId,
				reportType: reportType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-report-item__footer-status' ).text() ).toBe( 'Pass' );
	} );

	it( 'displays failed status when result is failed', function () {
		testStatus = false;
		var wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId,
				reportType: reportType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-report-item__footer-status' ).text() ).toBe( 'Fail' );
	} );

	it( 'displays pending status when implementation missing', function () {
		testStatus = undefined;
		var wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: '',
				zTesterId: zTesterId,
				reportType: reportType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-report-item__footer-status' ).text() ).toBe( 'Pending…' );
	} );

	it( 'displays pending status when tester missing', function () {
		testStatus = undefined;
		var wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: '',
				reportType: reportType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-report-item__footer-status' ).text() ).toBe( 'Pending…' );
	} );
} );
