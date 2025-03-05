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
		functionZid,
		implementationZid,
		testerZid,
		contentType;

	beforeEach( () => {
		store = useMainStore();
		functionZid = 'Z10000';
		implementationZid = 'Z10001';
		testerZid = 'Z10002';
		contentType = Constants.Z_TESTER;
		store.getZTesterResult = createGettersWithFunctionsMock( false );
		store.getLabelData = createLabelDataMock();
		store.getUserLangCode = 'en';
	} );

	it( 'renders without errors', () => {
		const wrapper = mount( FunctionReportItem, {
			props: {
				functionZid: functionZid,
				implementationZid: implementationZid,
				testerZid: testerZid,
				contentType: contentType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item' ).exists() ).toBeTruthy();
	} );

	it( 'fetches the test result for the provided IDs from Pinia', () => {
		mount( FunctionReportItem, {
			props: {
				functionZid: functionZid,
				implementationZid: implementationZid,
				testerZid: testerZid,
				contentType: contentType
			}
		} );
		expect( store.getZTesterResult ).toHaveBeenCalledWith( functionZid, testerZid, implementationZid );
	} );

	it( 'displays running status when ongoing call', () => {
		const wrapper = mount( FunctionReportItem, {
			props: {
				functionZid: functionZid,
				implementationZid: implementationZid,
				testerZid: testerZid,
				contentType: contentType,
				fetching: true
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Running…' );
	} );

	it( 'displays passed status when result is passed', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( true );

		const wrapper = mount( FunctionReportItem, {
			props: {
				functionZid: functionZid,
				implementationZid: implementationZid,
				testerZid: testerZid,
				contentType: contentType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Passed' );
	} );

	it( 'displays failed status when result is failed', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( false );

		const wrapper = mount( FunctionReportItem, {
			props: {
				functionZid: functionZid,
				implementationZid: implementationZid,
				testerZid: testerZid,
				contentType: contentType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Failed' );
	} );

	it( 'displays pending status when implementation missing', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( undefined );

		const wrapper = mount( FunctionReportItem, {
			props: {
				functionZid: functionZid,
				implementationZid: '',
				testerZid: testerZid,
				contentType: contentType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Ready' );
	} );

	it( 'displays pending status when tester missing', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( undefined );

		const wrapper = mount( FunctionReportItem, {
			props: {
				functionZid: functionZid,
				implementationZid: implementationZid,
				testerZid: '',
				contentType: contentType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Ready' );
	} );
} );
