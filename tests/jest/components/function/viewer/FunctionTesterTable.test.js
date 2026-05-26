/*!
 * WikiLambda unit test suite for the FunctionTesterTable component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const FunctionTesterTable = require( '../../../../../resources/ext.wikilambda.app/components/function/viewer/FunctionTesterTable.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../../helpers/getterHelpers.js' );

const functionZid = 'Z10000';
const testerZid = 'Z10001';
const implementationZid = 'Z10002';

// NOTE: minimal and not strictly valid metadata, just to test the pending key exists
const someMetadata = { K1: [ { Z1K1: 'Z882' }, { Z1K2: 'Z882', K1: 'someData', K2: 'woho!' } ] };
const pendingMetadata = { K1: [ { Z1K1: 'Z882' }, { Z1K2: 'Z882', K1: 'pending', K2: 'Z41' } ] };

describe( 'FunctionTesterTable', () => {
	let store;

	function renderFunctionTesterTable( props = {}, options = {} ) {
		const defaultProps = {
			zFunctionId: functionZid,
			zTesterId: testerZid,
			zImplementationId: implementationZid
		};
		return shallowMount( FunctionTesterTable, {
			props: { ...defaultProps, ...props },
			...options
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getZTesterResult = createGettersWithFunctionsMock( false );
		store.getZTesterMetadata = createGettersWithFunctionsMock( undefined );
		store.getLabelData = createLabelDataMock();
		store.hasFlyingPromise = createGettersWithFunctionsMock( false );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionTesterTable();
		expect( wrapper.find( '.ext-wikilambda-app-function-tester-table' ).exists() ).toBe( true );
	} );

	it( 'fetches the test result for the provided function, test and implementation Zids', () => {
		renderFunctionTesterTable();
		expect( store.getZTesterResult ).toHaveBeenCalledWith( functionZid, testerZid, implementationZid );
	} );

	it( 'displays running status when there is an ongoing call', () => {
		store.hasFlyingPromise = createGettersWithFunctionsMock( true );

		const wrapper = renderFunctionTesterTable();
		expect( wrapper.get( '.ext-wikilambda-app-function-tester-table__status-message' ).text() ).toBe( 'Running…' );
	} );

	it( 'displays passed status when result is passed', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( true );

		const wrapper = renderFunctionTesterTable();
		expect( wrapper.get( '.ext-wikilambda-app-function-tester-table__status-message' ).text() ).toBe( 'Passed' );
	} );

	it( 'displays failed status when result is failed', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( false );

		const wrapper = renderFunctionTesterTable();
		expect( wrapper.get( '.ext-wikilambda-app-function-tester-table__status-message' ).text() ).toBe( 'Failed' );
	} );

	it( 'displays ready status when result is undefined', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( undefined );

		const wrapper = renderFunctionTesterTable();
		expect( wrapper.get( '.ext-wikilambda-app-function-tester-table__status-message' ).text() ).toBe( 'Ready' );
	} );

	it( 'displays the details button when test has been executed', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( true );
		store.getZTesterMetadata = createGettersWithFunctionsMock( {
			// NOTE: minimal and not strictly valid metadata, just to test there is metadata
			K1: [ { Z1K1: 'Z882' }, { Z1K2: 'Z882', K1: 'someKey', K2: 'Z41' } ]
		} );
		store.hasFlyingPromise = createGettersWithFunctionsMock( false );

		const wrapper = renderFunctionTesterTable();
		const detailsButton = wrapper.find( '.ext-wikilambda-app-function-tester-table__info-button' );
		expect( detailsButton.exists() ).toBe( true );
		expect( detailsButton.attributes( 'aria-label' ) ).toBe( 'Details for Z10002' );
	} );

	it( 'does not display the details button when test is running', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( true );
		store.hasFlyingPromise = createGettersWithFunctionsMock( true );

		const wrapper = renderFunctionTesterTable();
		expect( wrapper.find( '.ext-wikilambda-app-function-tester-table__info-button' ).exists() ).toBe( false );
	} );

	it( 'displays the refresh button when test returned with a pending state', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( false );
		store.getZTesterMetadata = createGettersWithFunctionsMock( pendingMetadata );
		store.hasFlyingPromise = createGettersWithFunctionsMock( false );

		const wrapper = renderFunctionTesterTable();
		const buttons = wrapper.findAll( '.ext-wikilambda-app-function-tester-table__info-button' );
		const refreshButton = buttons.find( ( b ) => b.attributes( 'aria-label' ) === 'Refresh' );
		expect( refreshButton.exists() ).toBe( true );
	} );

	it( 'does not display the refresh button when test is running', () => {
		store.getZTesterResult = createGettersWithFunctionsMock( false );
		store.hasFlyingPromise = createGettersWithFunctionsMock( true );

		const wrapper = renderFunctionTesterTable();
		const buttons = wrapper.findAll( '.ext-wikilambda-app-function-tester-table__info-button' );
		const refreshButton = buttons.find( ( b ) => b.attributes( 'aria-label' ) === 'Refresh' );
		expect( refreshButton ).toBeUndefined();
	} );

	it( 'calls getTestResults for an individual test when the refresh button is clicked', async () => {
		store.getTestResults = jest.fn().mockResolvedValue();
		store.getZTesterResult = createGettersWithFunctionsMock( false );
		store.getZTesterMetadata = createGettersWithFunctionsMock( pendingMetadata );
		store.hasFlyingPromise = createGettersWithFunctionsMock( false );

		const wrapper = renderFunctionTesterTable();
		const buttons = wrapper.findAll( '.ext-wikilambda-app-function-tester-table__info-button' );
		const refreshButton = buttons.find( ( b ) => b.attributes( 'aria-label' ) === 'Refresh' );
		await refreshButton.trigger( 'click' );

		expect( store.getTestResults ).toHaveBeenCalledWith( {
			zFunctionId: functionZid,
			zTesters: [ testerZid ],
			zImplementations: [ implementationZid ],
			clearPreviousResults: true
		} );
	} );

	it( 'toggles the metadata dialog when the details button is clicked', async () => {
		store.getZTesterResult = createGettersWithFunctionsMock( true );
		store.getZTesterMetadata = createGettersWithFunctionsMock( someMetadata );
		store.hasFlyingPromise = createGettersWithFunctionsMock( false );

		const wrapper = renderFunctionTesterTable();
		const dialog = wrapper.findComponent( { name: 'wl-function-metadata-dialog' } );

		expect( dialog.props( 'open' ) ).toBeFalsy();

		const detailsButton = wrapper.find( '.ext-wikilambda-app-function-tester-table__info-button' );
		await detailsButton.trigger( 'click' );

		expect( dialog.props( 'open' ) ).toBeTruthy();
	} );
} );
