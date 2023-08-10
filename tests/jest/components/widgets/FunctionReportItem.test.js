/*!
 * WikiLambda unit test suite for the FunctionReportItem component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	FunctionReportItem = require( '../../../../resources/ext.wikilambda.edit/components/widgets/FunctionReportItem.vue' );

describe( 'FunctionReportItem', function () {
	var getters,
		testStatus,
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
		getters = {
			getFetchingTestResults: createGetterMock( false ),
			getZTesterResults: createGetterMock( returnStatus ),
			getLabel: createGettersWithFunctionsMock(),
			getUserLangCode: createGetterMock( 'en' )
		};
		global.store.hotUpdate( {
			getters: getters
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

	it( 'displays running status when ongoing call', function () {
		getters.getFetchingTestResults = createGetterMock( true );
		global.store.hotUpdate( { getters: getters } );
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
		expect( wrapper.find( '.ext-wikilambda-function-report-item__footer-status' ).text() ).toBe( 'Ready' );
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
		expect( wrapper.find( '.ext-wikilambda-function-report-item__footer-status' ).text() ).toBe( 'Ready' );
	} );
} );
