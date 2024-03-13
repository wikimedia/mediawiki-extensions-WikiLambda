/*!
 * WikiLambda unit test suite for the ZTesterImplResult component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
const VueTestUtils = require( '@vue/test-utils' ),
	{ waitFor } = require( '@testing-library/vue' ),
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	FunctionReport = require( '../../../../resources/ext.wikilambda.edit/components/widgets/FunctionReport.vue' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'FunctionReport', function () {
	let getters,
		actions;

	beforeEach( function () {
		getters = {
			getUserLangCode: createGetterMock( 'en' ),
			getLabel: createGettersWithFunctionsMock(),
			getStoredObject: createGettersWithFunctionsMock( {
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
			} ),
			getViewMode: createGettersWithFunctionsMock(),
			getZTesterPercentage: createGettersWithFunctionsMock( {
				passing: 1,
				total: 1,
				percentage: 100
			} ),
			getZTesterResults: createGettersWithFunctionsMock()
		};
		actions = {
			fetchZids: jest.fn(),
			getTestResults: jest.fn()
		};
		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', function () {
		const wrapper = VueTestUtils.mount( FunctionReport, {
			props: {
				zFunctionId: ''
			}
		} );
		expect( wrapper.find( 'div' ).exists() ).toBeTruthy();
	} );

	it( 'displays no results when no implementations or testers found', function () {
		const wrapper = VueTestUtils.mount( FunctionReport, {
			props: {
				zFunctionId: ''
			}
		} );
		expect( wrapper.find( 'p' ).text() )
			.toBe( 'No test results found. Please add an implementation and a test to see results.' );
	} );

	it( 'displays all available testers if a new zImplementation is being created', async function () {
		const wrapper = VueTestUtils.mount( FunctionReport, {
			props: {
				zFunctionId: 'Z10000',
				rootZid: Constants.NEW_ZID_PLACEHOLDER,
				reportType: Constants.Z_IMPLEMENTATION
			}
		} );

		expect( wrapper.vm.zIds ).toEqual( [ 'Z10002', 'Z10003' ] );

		const content = wrapper.findAll( '.ext-wikilambda-function-report__result' );
		expect( content.length ).toBe( 2 );
	} );

	it( 'displays all available implementations if a new zTester is being created', async function () {
		const wrapper = VueTestUtils.mount( FunctionReport, {
			props: {
				zFunctionId: 'Z10000',
				rootZid: Constants.NEW_ZID_PLACEHOLDER,
				reportType: Constants.Z_TESTER
			}
		} );

		expect( wrapper.vm.zIds ).toEqual( [ 'Z10001', 'Z10004', 'Z10005' ] );
		expect( wrapper.find( '.ext-wikilambda-widget-base-header-title' ).text() ).toEqual( 'Implementations' );

		const content = wrapper.findAll( '.ext-wikilambda-function-report__result' );
		expect( content.length ).toBe( 3 );
	} );

	it( 'if displayed on a ZImplementation page, only shows testers', function () {
		const wrapper = VueTestUtils.mount( FunctionReport, {
			props: {
				zFunctionId: 'Z10000',
				rootZid: 'Z10001',
				reportType: Constants.Z_IMPLEMENTATION
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-widget-base-header-title' ).text() ).toEqual( 'Tests' );
		expect( wrapper.vm.zIds ).toEqual( [ 'Z10002', 'Z10003' ] );
	} );

	it( 'if displayed on a ZTester page, only shows ZImplementations', function () {
		const wrapper = VueTestUtils.mount( FunctionReport, {
			props: {
				zFunctionId: 'Z10000',
				rootZid: 'Z10002',
				reportType: Constants.Z_TESTER
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-widget-base-header-title' ).text() ).toEqual( 'Implementations' );
		expect( wrapper.vm.zIds ).toEqual( [ 'Z10001', 'Z10004', 'Z10005' ] );
	} );

	describe( 'trigger button', () => {
		it( 'tests all the implementations for a tester page', async () => {
			actions.fetchZids = jest.fn();
			actions.getTestResults = jest.fn();
			global.store.hotUpdate( {
				getters: getters,
				actions: actions
			} );
			const wrapper = VueTestUtils.mount( FunctionReport, {
				props: {
					zFunctionId: 'Z10000',
					rootZid: 'Z10002',
					reportType: Constants.Z_TESTER
				}
			} );

			wrapper.find( 'button' ).trigger( 'click' );

			await waitFor( () => {
				expect( actions.getTestResults ).toHaveBeenCalledWith( expect.anything(), {
					zFunctionId: 'Z10000',
					zImplementations: [ 'Z10001', 'Z10004', 'Z10005' ],
					zTesters: [ 'Z10002' ],
					clearPreviousResults: true
				} );
			} );
		} );

		it( 'tests all the testers for an implementation page', async () => {
			actions.fetchZids = jest.fn();
			actions.getTestResults = jest.fn();
			global.store.hotUpdate( {
				getters: getters,
				actions: actions
			} );
			const wrapper = VueTestUtils.mount( FunctionReport, {
				props: {
					zFunctionId: 'Z10000',
					rootZid: 'Z10004',
					reportType: Constants.Z_IMPLEMENTATION
				}
			} );

			wrapper.find( 'button' ).trigger( 'click' );

			await waitFor( () => {
				expect( actions.getTestResults ).toHaveBeenCalledWith( expect.anything(), {
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
			actions.getTestResults = jest.fn();
			actions.fetchZids = jest.fn( () => {
				return { then: ( fn ) => fn() };
			} );
			global.store.hotUpdate( {
				getters: getters,
				actions: actions
			} );

			VueTestUtils.mount( FunctionReport, {
				props: {
					zFunctionId: 'Z10000',
					rootZid: 'Z0',
					reportType: Constants.Z_IMPLEMENTATION
				}
			} );

			// Wait for fetchZids to be called and then run all timers
			await waitFor( () => expect( actions.fetchZids ).toHaveBeenCalled() );
			jest.runAllTimers();

			await waitFor( () => expect( actions.getTestResults ).toHaveBeenCalledTimes( 0 ) );
		} );

		it( 'initially tests all the implementations for a tester page', async () => {
			actions.getTestResults = jest.fn();
			actions.fetchZids = jest.fn( () => {
				return { then: ( fn ) => fn() };
			} );
			global.store.hotUpdate( {
				getters: getters,
				actions: actions
			} );

			VueTestUtils.mount( FunctionReport, {
				props: {
					zFunctionId: 'Z10000',
					rootZid: 'Z10002',
					reportType: Constants.Z_TESTER
				}
			} );

			await waitFor( () => expect( actions.fetchZids ).toHaveBeenCalled() );
			jest.runAllTimers();

			await waitFor( () => {
				expect( actions.getTestResults ).toHaveBeenCalledWith( expect.anything(), {
					zFunctionId: 'Z10000',
					zImplementations: [ 'Z10001', 'Z10004', 'Z10005' ],
					zTesters: [ 'Z10002' ],
					clearPreviousResults: true
				} );
			} );
		} );

		it( 'initially tests all the testers for an implementation page', async () => {
			actions.getTestResults = jest.fn();
			actions.fetchZids = jest.fn( () => {
				return { then: ( fn ) => fn() };
			} );
			global.store.hotUpdate( {
				getters: getters,
				actions: actions
			} );

			VueTestUtils.mount( FunctionReport, {
				props: {
					zFunctionId: 'Z10000',
					rootZid: 'Z10004',
					reportType: Constants.Z_IMPLEMENTATION
				}
			} );

			// Wait for fetchZids to be called and then run all timers
			await waitFor( () => expect( actions.fetchZids ).toHaveBeenCalled() );
			jest.runAllTimers();

			await waitFor( () => {
				expect( actions.getTestResults ).toHaveBeenCalledWith( expect.anything(), {
					zFunctionId: 'Z10000',
					zImplementations: [ 'Z10004' ],
					zTesters: [ 'Z10002', 'Z10003' ],
					clearPreviousResults: true
				} );
			} );
		} );
	} );
} );
