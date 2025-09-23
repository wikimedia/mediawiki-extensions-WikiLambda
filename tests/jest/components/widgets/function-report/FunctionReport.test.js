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

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangCode = 'en';
		store.getCurrentZObjectId = 'Z0';
		store.getLabelData = createLabelDataMock();
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
		const wrapper = mount( FunctionReport, {
			props: {
				functionZid: undefined,
				contentType: Constants.Z_IMPLEMENTATION
			}
		} );
		expect( wrapper.find( 'div' ).exists() ).toBeTruthy();
	} );

	it( 'displays no results when no implementations or testers found', () => {
		const wrapper = mount( FunctionReport, {
			props: {
				functionZid: '',
				contentType: Constants.Z_IMPLEMENTATION
			}
		} );
		expect( wrapper.find( 'p' ).text() )
			.toBe( 'No test results found. Please add an implementation and a test to see results.' );
	} );

	it( 'displays all available testers if a new zImplementation is being created', async () => {
		const wrapper = mount( FunctionReport, {
			props: {
				functionZid: 'Z10000',
				contentType: Constants.Z_IMPLEMENTATION
			}
		} );

		expect( wrapper.vm.zids ).toEqual( [ 'Z10002', 'Z10003' ] );

		const content = wrapper.findAll( '.ext-wikilambda-app-function-report-widget__result' );
		expect( content.length ).toBe( 2 );
	} );

	it( 'displays all available implementations if a new zTester is being created', async () => {
		const wrapper = mount( FunctionReport, {
			props: {
				functionZid: 'Z10000',
				contentType: Constants.Z_TESTER
			}
		} );

		expect( wrapper.vm.zids ).toEqual( [ 'Z10001', 'Z10004', 'Z10005' ] );
		expect( wrapper.find( '.ext-wikilambda-app-widget-base__header-title' ).text() ).toEqual( 'Implementations' );

		const content = wrapper.findAll( '.ext-wikilambda-app-function-report-widget__result' );
		expect( content.length ).toBe( 3 );
	} );

	it( 'if displayed on a ZImplementation page, only shows testers', () => {
		store.getCurrentZObjectId = 'Z10001';
		const wrapper = mount( FunctionReport, {
			props: {
				functionZid: 'Z10000',
				contentType: Constants.Z_IMPLEMENTATION
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-app-widget-base__header-title' ).text() ).toEqual( 'Tests' );
		expect( wrapper.vm.zids ).toEqual( [ 'Z10002', 'Z10003' ] );
	} );

	it( 'if displayed on a ZTester page, only shows ZImplementations', () => {
		store.getCurrentZObjectId = 'Z10002';
		const wrapper = mount( FunctionReport, {
			props: {
				functionZid: 'Z10000',
				contentType: Constants.Z_TESTER
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-app-widget-base__header-title' ).text() ).toEqual( 'Implementations' );
		expect( wrapper.vm.zids ).toEqual( [ 'Z10001', 'Z10004', 'Z10005' ] );
	} );

	describe( 'trigger button', () => {
		it( 'tests all the implementations for a tester page', async () => {
			store.getCurrentZObjectId = 'Z10002';
			const wrapper = mount( FunctionReport, {
				props: {
					functionZid: 'Z10000',
					contentType: Constants.Z_TESTER
				}
			} );

			wrapper.find( 'button' ).trigger( 'click' );

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
			const wrapper = mount( FunctionReport, {
				props: {
					functionZid: 'Z10000',
					contentType: Constants.Z_IMPLEMENTATION
				}
			} );

			wrapper.find( 'button' ).trigger( 'click' );

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
			const wrapper = mount( FunctionReport, {
				props: {
					functionZid: 'Z10000',
					contentType: Constants.Z_TESTER
				}
			} );

			// Mock getTestResults to not resolve immediately
			store.getTestResults.mockReturnValue( new Promise( () => {} ) );

			// Start a request
			wrapper.find( 'button' ).trigger( 'click' );

			// Verify we're in fetching state
			expect( wrapper.vm.fetching ).toBe( true );

			// Click cancel (same button, different behavior when fetching)
			wrapper.find( 'button' ).trigger( 'click' );

			// Verify we're no longer fetching
			expect( wrapper.vm.fetching ).toBe( false );
		} );
	} );

	describe( 'on mount', () => {
		beforeEach( () => {
			jest.useFakeTimers();
			jest.spyOn( global, 'setTimeout' );
		} );

		it( 'does not trigger the tests if we are on new page', async () => {
			mount( FunctionReport, {
				props: {
					functionZid: 'Z10000',
					contentType: Constants.Z_IMPLEMENTATION
				}
			} );

			// Wait for fetchZids to be called and then run all timers
			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalled() );
			jest.runAllTimers();

			await waitFor( () => expect( store.getTestResults ).toHaveBeenCalledTimes( 0 ) );
		} );

		it( 'initially tests all the implementations for a tester page', async () => {
			store.getCurrentZObjectId = 'Z10002';
			mount( FunctionReport, {
				props: {
					functionZid: 'Z10000',
					contentType: Constants.Z_TESTER
				}
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
			mount( FunctionReport, {
				props: {
					functionZid: 'Z10000',
					contentType: Constants.Z_IMPLEMENTATION
				}
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
