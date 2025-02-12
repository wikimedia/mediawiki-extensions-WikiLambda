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

describe( 'FunctionReport', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangCode = 'en';
		store.getLabelData = createLabelDataMock();
		store.getStoredObject = createGettersWithFunctionsMock( {
			[ Constants.Z_PERSISTENTOBJECT_VALUE ]:
			{
				[ Constants.Z_FUNCTION_TESTERS ]: [
					Constants.Z_TESTER,
					'Z10002',
					'Z10003'
				],
				[ Constants.Z_FUNCTION_IMPLEMENTATIONS ]: [
					Constants.Z_IMPLEMENTATION,
					'Z10001',
					'Z10004',
					'Z10005'
				]
			}
		} );
		store.getViewMode = createGettersWithFunctionsMock();
		store.getZTesterPercentage = createGettersWithFunctionsMock( {
			passing: 1,
			total: 1,
			percentage: 100
		} );
		store.getZTesterResults = createGettersWithFunctionsMock();
		store.fetchZids.mockResolvedValue();
		store.getTestResults.mockResolvedValue();
	} );

	it( 'renders without errors', () => {
		const wrapper = mount( FunctionReport, {
			props: {
				zFunctionId: '',
				rootZid: Constants.NEW_ZID_PLACEHOLDER,
				reportType: Constants.Z_IMPLEMENTATION
			}
		} );
		expect( wrapper.find( 'div' ).exists() ).toBeTruthy();
	} );

	it( 'displays no results when no implementations or testers found', () => {
		const wrapper = mount( FunctionReport, {
			props: {
				zFunctionId: '',
				rootZid: Constants.NEW_ZID_PLACEHOLDER,
				reportType: Constants.Z_IMPLEMENTATION
			}
		} );
		expect( wrapper.find( 'p' ).text() )
			.toBe( 'No test results found. Please add an implementation and a test to see results.' );
	} );

	it( 'displays all available testers if a new zImplementation is being created', async () => {
		const wrapper = mount( FunctionReport, {
			props: {
				zFunctionId: 'Z10000',
				rootZid: Constants.NEW_ZID_PLACEHOLDER,
				reportType: Constants.Z_IMPLEMENTATION
			}
		} );

		expect( wrapper.vm.zIds ).toEqual( [ 'Z10002', 'Z10003' ] );

		const content = wrapper.findAll( '.ext-wikilambda-app-function-report-widget__result' );
		expect( content.length ).toBe( 2 );
	} );

	it( 'displays all available implementations if a new zTester is being created', async () => {
		const wrapper = mount( FunctionReport, {
			props: {
				zFunctionId: 'Z10000',
				rootZid: Constants.NEW_ZID_PLACEHOLDER,
				reportType: Constants.Z_TESTER
			}
		} );

		expect( wrapper.vm.zIds ).toEqual( [ 'Z10001', 'Z10004', 'Z10005' ] );
		expect( wrapper.find( '.ext-wikilambda-app-widget-base__header-title' ).text() ).toEqual( 'Implementations' );

		const content = wrapper.findAll( '.ext-wikilambda-app-function-report-widget__result' );
		expect( content.length ).toBe( 3 );
	} );

	it( 'if displayed on a ZImplementation page, only shows testers', () => {
		const wrapper = mount( FunctionReport, {
			props: {
				zFunctionId: 'Z10000',
				rootZid: 'Z10001',
				reportType: Constants.Z_IMPLEMENTATION
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-app-widget-base__header-title' ).text() ).toEqual( 'Tests' );
		expect( wrapper.vm.zIds ).toEqual( [ 'Z10002', 'Z10003' ] );
	} );

	it( 'if displayed on a ZTester page, only shows ZImplementations', () => {
		const wrapper = mount( FunctionReport, {
			props: {
				zFunctionId: 'Z10000',
				rootZid: 'Z10002',
				reportType: Constants.Z_TESTER
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-app-widget-base__header-title' ).text() ).toEqual( 'Implementations' );
		expect( wrapper.vm.zIds ).toEqual( [ 'Z10001', 'Z10004', 'Z10005' ] );
	} );

	describe( 'trigger button', () => {
		it( 'tests all the implementations for a tester page', async () => {
			const wrapper = mount( FunctionReport, {
				props: {
					zFunctionId: 'Z10000',
					rootZid: 'Z10002',
					reportType: Constants.Z_TESTER
				}
			} );

			wrapper.find( 'button' ).trigger( 'click' );

			await waitFor( () => {
				expect( store.getTestResults ).toHaveBeenCalledWith( {
					zFunctionId: 'Z10000',
					zImplementations: [ 'Z10001', 'Z10004', 'Z10005' ],
					zTesters: [ 'Z10002' ],
					clearPreviousResults: true
				} );
			} );
		} );

		it( 'tests all the testers for an implementation page', async () => {
			const wrapper = mount( FunctionReport, {
				props: {
					zFunctionId: 'Z10000',
					rootZid: 'Z10004',
					reportType: Constants.Z_IMPLEMENTATION
				}
			} );

			wrapper.find( 'button' ).trigger( 'click' );

			await waitFor( () => {
				expect( store.getTestResults ).toHaveBeenCalledWith( {
					zFunctionId: 'Z10000',
					zImplementations: [ 'Z10004' ],
					zTesters: [ 'Z10002', 'Z10003' ],
					clearPreviousResults: true
				} );
			} );
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
					zFunctionId: 'Z10000',
					rootZid: 'Z0',
					reportType: Constants.Z_IMPLEMENTATION
				}
			} );

			// Wait for fetchZids to be called and then run all timers
			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalled() );
			jest.runAllTimers();

			await waitFor( () => expect( store.getTestResults ).toHaveBeenCalledTimes( 0 ) );
		} );

		it( 'initially tests all the implementations for a tester page', async () => {

			mount( FunctionReport, {
				props: {
					zFunctionId: 'Z10000',
					rootZid: 'Z10002',
					reportType: Constants.Z_TESTER
				}
			} );

			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalled() );
			jest.runAllTimers();

			await waitFor( () => {
				expect( store.getTestResults ).toHaveBeenCalledWith( {
					zFunctionId: 'Z10000',
					zImplementations: [ 'Z10001', 'Z10004', 'Z10005' ],
					zTesters: [ 'Z10002' ],
					clearPreviousResults: true
				} );
			} );
			await waitFor( () => expect( store.getTestResults ).toHaveBeenCalledTimes( 1 ) );
		} );

		it( 'initially tests all the testers for an implementation page', async () => {

			mount( FunctionReport, {
				props: {
					zFunctionId: 'Z10000',
					rootZid: 'Z10004',
					reportType: Constants.Z_IMPLEMENTATION
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
					clearPreviousResults: true
				} );
			} );
			await waitFor( () => expect( store.getTestResults ).toHaveBeenCalledTimes( 1 ) );
		} );
	} );
} );
