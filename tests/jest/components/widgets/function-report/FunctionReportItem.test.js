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
	let store;

	// Default props used across tests
	const functionZid = 'Z10000';
	const implementationZid = 'Z10001';
	const testerZid = 'Z10002';
	const contentType = Constants.Z_TESTER;

	function renderFunctionReportItem( props = {}, options = {} ) {
		const defaultProps = {
			functionZid,
			implementationZid,
			testerZid,
			contentType
		};
		return mount( FunctionReportItem, {
			props: { ...defaultProps, ...props },
			...options
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getZTesterResult = createGettersWithFunctionsMock( false );
		store.getLabelData = createLabelDataMock();
		store.getUserLangCode = 'en';
		store.hasFlyingPromise = createGettersWithFunctionsMock( false );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionReportItem();
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item' ).exists() ).toBe( true );
	} );

	it( 'fetches the test result for the provided IDs from Pinia', () => {
		renderFunctionReportItem();
		expect( store.getZTesterResult ).toHaveBeenCalledWith( functionZid, testerZid, implementationZid );
	} );

	it( 'displays running status when ongoing call', () => {
		store.hasFlyingPromise = createGettersWithFunctionsMock( true );

		const wrapper = renderFunctionReportItem();
		expect( wrapper.get( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Running…' );
	} );

	it( 'displays passed status when result is passed', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( true );

		const wrapper = renderFunctionReportItem();
		expect( wrapper.get( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Passed' );
		expect( wrapper.vm.statusIcon ).toBe( '<path data-testid="mock-icon-cdxIconSuccess"/>' );
	} );

	it( 'displays failed status when result is failed', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( false );

		const wrapper = renderFunctionReportItem();
		expect( wrapper.get( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Failed' );
		expect( wrapper.vm.statusIcon ).toBe( '<path data-testid="mock-icon-cdxIconClear"/>' );
	} );

	it( 'displays pending status when implementation missing', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( undefined );

		const wrapper = renderFunctionReportItem( { implementationZid: '' } );
		expect( wrapper.get( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Ready' );
		expect( wrapper.vm.statusIcon ).toBe( '<path data-testid="mock-icon-cdxIconClock"/>' );
	} );

	it( 'displays pending status when tester missing', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( undefined );

		const wrapper = renderFunctionReportItem( { testerZid: '' } );
		expect( wrapper.get( '.ext-wikilambda-app-function-report-item__footer-status' ).text() ).toBe( 'Ready' );
		expect( wrapper.vm.statusIcon ).toBe( '<path data-testid="mock-icon-cdxIconClock"/>' );
	} );

	it( 'displays the details button when there is metadata to show', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( true );
		store.hasFlyingPromise = createGettersWithFunctionsMock( false );

		const wrapper = renderFunctionReportItem();
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item__footer-button' )
			.text() ).toBe( 'Details' );
	} );

	it( 'displays the refresh button when test returned in a pending state', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( false );
		store.hasFlyingPromise = createGettersWithFunctionsMock( false );
		store.getZTesterMetadata = createGettersWithFunctionsMock( {
			// NOTE: minimal and not strictly valid metadata, just to test the pending key exists
			K1: [ { Z1K1: 'Z882' }, { Z1K2: 'Z882', K1: 'pending', K2: 'Z41' } ]
		} );

		const wrapper = renderFunctionReportItem();
		expect( wrapper.find( '.ext-wikilambda-app-function-report-item__footer-button' )
			.text() ).toBe( 'Refresh' );
	} );
} );
