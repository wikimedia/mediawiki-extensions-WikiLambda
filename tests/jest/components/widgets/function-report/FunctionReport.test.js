/*!
 * WikiLambda unit test suite for the ZTesterImplResult component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const FunctionReport = require( '../../../../../resources/ext.wikilambda.app/components/widgets/function-report/FunctionReport.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../../helpers/getterHelpers.js' );

const functionObject = { Z2K2: {
	Z8K3: [ 'Z20', 'Z10002', 'Z10003' ],
	Z8K4: [ 'Z14', 'Z10001', 'Z10004', 'Z10005' ]
} };

describe( 'FunctionReport', () => {
	let store;

	function renderFunctionReport( props = {}, options = {} ) {
		return mount( FunctionReport, {
			props,
			...options
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangCode = 'en';
		store.getCurrentZObjectId = 'Z0';
		store.getLabelData = createLabelDataMock( {
			Z10000: 'Test Function',
			Z10001: 'Test Implementation 1',
			Z10002: 'Test Tester 1',
			Z10003: 'Test Tester 2',
			Z10004: 'Test Implementation 2',
			Z10005: 'Test Implementation 3'
		} );
		store.getStoredObject = createGettersWithFunctionsMock( functionObject );
		store.getViewMode = createGettersWithFunctionsMock( true );
		store.getZTesterPercentage = createGettersWithFunctionsMock( {
			passing: 1,
			total: 1,
			percentage: 100
		} );
		store.getZTesterResult = createGettersWithFunctionsMock();
		store.fetchZids.mockResolvedValue();
		store.getTestResults.mockResolvedValue();
	} );

	afterEach( () => {
		store.getTestResults.mockClear();
		jest.clearAllMocks();
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionReport( {
			functionZid: undefined,
			contentType: Constants.Z_IMPLEMENTATION
		} );
		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'displays no results when no implementations or testers found', () => {
		const wrapper = renderFunctionReport( {
			functionZid: '',
			contentType: Constants.Z_IMPLEMENTATION
		} );
		expect( wrapper.get( 'p' ).text() )
			.toBe( 'No test results found. Please add an implementation and a test to see results.' );
	} );

	it( 'displays all available testers if a new zImplementation is being created', async () => {
		const wrapper = renderFunctionReport( {
			functionZid: 'Z10000',
			contentType: Constants.Z_IMPLEMENTATION
		} );

		// Check that the correct number of testers are displayed
		const content = wrapper.findAll( '.ext-wikilambda-app-function-report-widget__result' );
		expect( content.length ).toBe( 2 );
		expect( content.at( 0 ).text() ).toContain( 'Test Tester 1' );
		expect( content.at( 1 ).text() ).toContain( 'Test Tester 2' );
	} );

	it( 'displays all available implementations if a new zTester is being created', async () => {
		const wrapper = renderFunctionReport( {
			functionZid: 'Z10000',
			contentType: Constants.Z_TESTER
		} );

		expect( wrapper.get( '.ext-wikilambda-app-widget-base__header-title' ).text() ).toEqual( 'Implementations' );

		const content = wrapper.findAll( '.ext-wikilambda-app-function-report-widget__result' );
		expect( content.length ).toBe( 3 );
		expect( content.at( 0 ).text() ).toContain( 'Test Implementation 1' );
		expect( content.at( 1 ).text() ).toContain( 'Test Implementation 2' );
		expect( content.at( 2 ).text() ).toContain( 'Test Implementation 3' );
	} );

	it( 'if displayed on a ZImplementation page, only shows testers', () => {
		store.getCurrentZObjectId = 'Z10001';
		const wrapper = renderFunctionReport( {
			functionZid: 'Z10000',
			contentType: Constants.Z_IMPLEMENTATION
		} );

		expect( wrapper.get( '.ext-wikilambda-app-widget-base__header-title' ).text() ).toEqual( 'Tests' );
		// Check that the correct number of testers are displayed
		const content = wrapper.findAll( '.ext-wikilambda-app-function-report-widget__result' );
		expect( content.length ).toBe( 2 );
		expect( content.at( 0 ).text() ).toContain( 'Test Tester 1' );
		expect( content.at( 1 ).text() ).toContain( 'Test Tester 2' );
	} );

	it( 'if displayed on a ZTester page, only shows ZImplementations', () => {
		store.getCurrentZObjectId = 'Z10002';
		const wrapper = renderFunctionReport( {
			functionZid: 'Z10000',
			contentType: Constants.Z_TESTER
		} );

		expect( wrapper.get( '.ext-wikilambda-app-widget-base__header-title' ).text() ).toEqual( 'Implementations' );
		// Check that the correct number of implementations are displayed
		const content = wrapper.findAll( '.ext-wikilambda-app-function-report-widget__result' );
		expect( content.length ).toBe( 3 );
		expect( content.at( 0 ).text() ).toContain( 'Test Implementation 1' );
		expect( content.at( 1 ).text() ).toContain( 'Test Implementation 2' );
		expect( content.at( 2 ).text() ).toContain( 'Test Implementation 3' );
	} );

	describe( 'trigger button', () => {
		it( 'tests all the implementations for a tester page', async () => {
			store.getCurrentZObjectId = 'Z10002';
			const wrapper = renderFunctionReport( {
				functionZid: 'Z10000',
				contentType: Constants.Z_TESTER
			} );

			wrapper.get( 'button' ).trigger( 'click' );

			await waitFor( () => {
				expect( store.getTestResults ).toHaveBeenCalledWith( {
					zFunctionId: 'Z10000',
					zImplementations: [ 'Z10001', 'Z10004', 'Z10005' ],
					zTesters: [ 'Z10002' ],
					clearPreviousResults: true,
					signal: expect.any( Object )
				} );
			} );
		} );

		it( 'tests all the testers for an implementation page', async () => {
			store.getCurrentZObjectId = 'Z10004';
			const wrapper = renderFunctionReport( {
				functionZid: 'Z10000',
				contentType: Constants.Z_IMPLEMENTATION
			} );

			wrapper.get( 'button' ).trigger( 'click' );

			await waitFor( () => {
				expect( store.getTestResults ).toHaveBeenCalledWith( {
					zFunctionId: 'Z10000',
					zImplementations: [ 'Z10004' ],
					zTesters: [ 'Z10002', 'Z10003' ],
					clearPreviousResults: true,
					signal: expect.any( Object )
				} );
			} );
		} );

		it( 'cancels the current request when button is clicked while fetching', async () => {
			store.getCurrentZObjectId = 'Z10002';
			const wrapper = renderFunctionReport( {
				functionZid: 'Z10000',
				contentType: Constants.Z_TESTER
			} );

			// Mock getTestResults to not resolve immediately
			store.getTestResults.mockReturnValue( new Promise( () => {} ) );

			// Start a request
			wrapper.get( 'button' ).trigger( 'click' );

			// Verify we're in fetching state
			await waitFor( () => expect( wrapper.get( '.ext-wikilambda-app-function-report-item' ).text() ).toContain( 'Running…' ) );

			// Click cancel (same button, different behavior when fetching)
			wrapper.get( 'button' ).trigger( 'click' );

			// Verify we're no longer fetching
			await waitFor( () => expect( wrapper.get( '.ext-wikilambda-app-function-report-item' ).text() ).toContain( 'Test Implementation 1' ) );
		} );
	} );

	describe( 'on mount', () => {
		beforeEach( () => {
			jest.useFakeTimers();
			jest.spyOn( global, 'setTimeout' );
		} );

		it( 'does not trigger the tests if we are on new page', async () => {
			renderFunctionReport( {
				functionZid: 'Z10000',
				contentType: Constants.Z_IMPLEMENTATION
			} );

			// Wait for fetchZids to be called and then run all timers
			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalled() );
			jest.runAllTimers();

			await waitFor( () => expect( store.getTestResults ).toHaveBeenCalledTimes( 0 ) );
		} );

		it( 'initially tests all the implementations for a tester page', async () => {
			store.getCurrentZObjectId = 'Z10002';
			renderFunctionReport( {
				functionZid: 'Z10000',
				contentType: Constants.Z_TESTER
			} );

			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalled() );
			jest.runAllTimers();

			await waitFor( () => {
				expect( store.getTestResults ).toHaveBeenCalledWith( {
					zFunctionId: 'Z10000',
					zImplementations: [ 'Z10001', 'Z10004', 'Z10005' ],
					zTesters: [ 'Z10002' ],
					clearPreviousResults: true,
					signal: expect.any( Object )
				} );
			} );
		} );

		it( 'initially tests all the testers for an implementation page', async () => {
			store.getCurrentZObjectId = 'Z10004';
			renderFunctionReport( {
				functionZid: 'Z10000',
				contentType: Constants.Z_IMPLEMENTATION
			} );

			// Wait for fetchZids to be called and then run all timers
			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalled() );
			jest.runAllTimers();

			await waitFor( () => {
				expect( store.getTestResults ).toHaveBeenCalledWith( {
					zFunctionId: 'Z10000',
					zImplementations: [ 'Z10004' ],
					zTesters: [ 'Z10002', 'Z10003' ],
					clearPreviousResults: true,
					signal: expect.any( Object )
				} );
			} );
		} );
	} );
} );
