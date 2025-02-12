/*!
 * WikiLambda unit test suite for the FunctionReportItem component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );

const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const FunctionReportItem = require( '../../../../../resources/ext.wikilambda.app/components/widgets/function-report/FunctionReportItem.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../../helpers/getterHelpers.js' );

describe( 'FunctionReportItem', () => {
	let store,
		zFunctionId,
		zImplementationId,
		zTesterId,
		reportType;

	beforeEach( () => {
		store = useMainStore();
		zFunctionId = 'Z10000';
		zImplementationId = 'Z10001';
		zTesterId = 'Z10002';
		reportType = Constants.Z_TESTER;
		store.getZTesterResults = createGettersWithFunctionsMock( false );
		store.getLabelData = createLabelDataMock();
		store.getUserLangCode = 'en';
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
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item' ).exists() ).toBeTruthy();
	} );

	it( 'fetches the test result for the provided IDs from Pinia', () => {
		mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId,
				reportType: reportType
			}
		} );
		expect( store.getZTesterResults ).toHaveBeenCalledWith( zFunctionId, zTesterId, zImplementationId );
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
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Running…' );
	} );

	it( 'displays passed status when result is passed', () => {
		store.getZTesterResults = createGettersWithFunctionsMock( true );

		const wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId,
				reportType: reportType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Passed' );
	} );

	it( 'displays failed status when result is failed', () => {
		store.getZTesterResults = createGettersWithFunctionsMock( false );

		const wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: zTesterId,
				reportType: reportType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Failed' );
	} );

	it( 'displays pending status when implementation missing', () => {
		store.getZTesterResults = createGettersWithFunctionsMock( undefined );

		const wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: '',
				zTesterId: zTesterId,
				reportType: reportType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Ready' );
	} );

	it( 'displays pending status when tester missing', () => {
		store.getZTesterResults = createGettersWithFunctionsMock( undefined );

		const wrapper = mount( FunctionReportItem, {
			props: {
				zFunctionId: zFunctionId,
				zImplementationId: zImplementationId,
				zTesterId: '',
				reportType: reportType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Ready' );
	} );
} );
