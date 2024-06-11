/*!
 * WikiLambda unit test suite for the FunctionReportItem component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const mount = require( '@vue/test-utils' ).mount,
	createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	FunctionReportItem = require( '../../../../resources/ext.wikilambda.edit/components/widgets/FunctionReportItem.vue' );

describe( 'FunctionReportItem', () => {
	let getters,
		testStatus,
		zFunctionId,
		zImplementationId,
		zTesterId,
		reportType;
	const returnStatus = jest.fn( () => testStatus );

	beforeEach( () => {
		zFunctionId = 'Z10000';
		zImplementationId = 'Z10001';
		zTesterId = 'Z10002';
		reportType = Constants.Z_TESTER;
		getters = {
			getZTesterResults: createGetterMock( returnStatus ),
			getLabelData: createLabelDataMock(),
			getUserLangCode: createGetterMock( 'en' )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId,
				reportType: reportType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-report-item' ).exists() ).toBeTruthy();
	} );

	it( 'fetches the test result for the provided IDs from Vuex', () => {
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

	it( 'displays running status when ongoing call', () => {
		const wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId,
				reportType: reportType,
				fetching: true
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-report-item__footer-status' ).text() ).toBe( 'Running…' );
	} );

	it( 'displays passed status when result is passed', () => {
		testStatus = true;
		const wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId,
				reportType: reportType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-report-item__footer-status' ).text() ).toBe( 'Passed' );
	} );

	it( 'displays failed status when result is failed', () => {
		testStatus = false;
		const wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId,
				reportType: reportType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-report-item__footer-status' ).text() ).toBe( 'Failed' );
	} );

	it( 'displays pending status when implementation missing', () => {
		testStatus = undefined;
		const wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: '',
				zTesterId: zTesterId,
				reportType: reportType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-report-item__footer-status' ).text() ).toBe( 'Ready' );
	} );

	it( 'displays pending status when tester missing', () => {
		testStatus = undefined;
		const wrapper = mount( FunctionReportItem, {
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
