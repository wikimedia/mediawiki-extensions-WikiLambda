/*!
 * WikiLambda unit test suite for FunctionEvaluator Widget.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../../helpers/getterHelpers.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const FunctionEvaluator = require( '../../../../../resources/ext.wikilambda.app/components/widgets/function-evaluator/FunctionEvaluator.vue' );

describe( 'FunctionEvaluator', () => {
	let store;

	const functionCallJson = {
		Z1K1: 'Z7',
		Z7K1: 'Z10000',
		Z10000K1: 'pangolin',
		Z10000K2: 'armadillo'
	};
	const contentJson = {
		Z1K1: 'Z14',
		Z14K3: {
			Z1K1: 'Z16',
			Z16K1: 'Z610',
			Z16K2: 'some buggy python code'
		}
	};
	const functionJson = {
		Z2K1: { Z1K1: 'Z6', Z6K1: 'Z10000' },
		Z2K2: {
			Z1K1: 'Z8',
			Z8K1: [ 'Z17' ],
			Z8K2: 'Z6',
			Z8K3: [ 'Z20' ],
			Z8K4: [ 'Z14', 'Z10001', 'Z10002' ],
			Z8K5: 'Z10003'
		}
	};
	const implementationCall = {
		Z1K1: 'Z7',
		Z7K1: {
			Z1K1: 'Z8',
			Z8K1: [ 'Z17' ],
			Z8K2: 'Z6',
			Z8K3: [ 'Z20' ],
			Z8K4: [
				'Z14',
				{
					Z1K1: 'Z14',
					Z14K3: {
						Z1K1: 'Z16',
						Z16K1: 'Z610',
						Z16K2: 'some buggy python code'
					}
				}
			],
			Z8K5: 'Z10003'
		},
		Z10000K1: 'pangolin',
		Z10000K2: 'armadillo'
	};

	beforeEach( () => {
		store = useMainStore();
		store.getErrors = createGettersWithFunctionsMock( [] );
		store.getCurrentZObjectId = 'Z12345';
		store.getCurrentZObjectType = 'Z14';
		store.getStoredObject = createGettersWithFunctionsMock( undefined );
		store.getZFunctionCallArguments = createGettersWithFunctionsMock( [] );
		store.getRowByKeyPath = createGettersWithFunctionsMock( undefined );
		store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( undefined );
		store.getConnectedObjects = createGettersWithFunctionsMock( [] );
		store.getZObjectAsJsonById = '';
		store.getLabelData = createLabelDataMock();
		store.getUserLangZid = 'Z1002';
		store.userCanRunFunction = true;
		store.userCanRunUnsavedCode = true;
		store.waitForRunningParsers = Promise.resolve();
		store.getMetadataError = undefined;
		store.fetchZids.mockResolvedValue();
		store.callZFunction.mockResolvedValue();
	} );

	describe( 'in function call special page', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( FunctionEvaluator );

			expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget' ).exists() ).toBe( true );
		} );

		it( 'initializes detached objects', async () => {
			shallowMount( FunctionEvaluator );

			await waitFor( () => expect( store.initializeResultId ).toHaveBeenCalledTimes( 2 ) );
			await waitFor( () => expect( store.changeType ).toHaveBeenCalledTimes( 1 ) );
		} );

		it( 'renders special page title', () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			expect( wrapper.find( '.ext-wikilambda-app-widget-base__header' ).text() ).toBe( 'Try a function' );
		} );

		it( 'renders function call block', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			wrapper.vm.functionCallRowId = 1;
			// returns selectedFunctionRowId = 2
			store.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2 } );

			await wrapper.vm.$nextTick();
			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const block = wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__call' );
			const component = block.findComponent( { name: 'wl-z-reference' } );
			expect( component.exists() ).toBe( true );
			expect( component.props( 'rowId' ) ).toBe( 2 );
		} );

		it( 'renders disabled function call button', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const block = wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__run-button' );
			const button = block.findComponent( { name: 'cdx-button' } );
			expect( button.exists() ).toBe( true );
			expect( button.attributes( 'disabled' ) ).toBe( 'true' );
		} );

		it( 'does not render inputs block', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__inputs' ).exists() ).toBe( false );
		} );

		it( 'does not render orchestration result block', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__result' ).exists() ).toBe( false );
		} );

		it( 'renders arguments when function is selected', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			wrapper.vm.functionCallRowId = 1;
			// returns selectedFunctionRowId = 2
			store.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2 } );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const functionSelector = wrapper.getComponent( { name: 'wl-z-reference' } );
			expect( functionSelector.exists() ).toBeTruthy();
			await functionSelector.vm.$emit( 'set-value', { value: 'Z10000', keyPath: [ 'Z9K1' ] } );

			expect( store.setZFunctionCallArguments ).toHaveBeenCalledWith( {
				functionZid: 'Z10000',
				parentId: 1
			} );
			expect( store.setValueByRowIdAndPath ).toHaveBeenCalledWith( {
				rowId: 2,
				keyPath: [ 'Z9K1' ],
				value: 'Z10000'
			} );
		} );

		it( 'renders inputs block when there are inputs to enter', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			wrapper.vm.functionCallRowId = 1;
			store.getZFunctionCallArguments = createGettersWithFunctionsMock( [
				{ key: 'Z10000K1', id: 4, parent: 1 },
				{ key: 'Z10000K2', id: 5, parent: 1 }
			] );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const inputBlock = wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__inputs' );
			expect( inputBlock.exists() ).toBe( true );

			const inputs = inputBlock.findAllComponents( { name: 'wl-z-object-key-value' } );
			expect( inputs.length ).toBe( 2 );
			expect( inputs[ 0 ].props( 'rowId' ) ).toBe( 4 );
			expect( inputs[ 1 ].props( 'rowId' ) ).toBe( 5 );
		} );

		it( 'renders disabled call function button when function has no implementations', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			wrapper.vm.functionCallRowId = 1;
			wrapper.vm.resultRowId = 2;
			// returns selectedFunctionRowId = 2
			store.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2 } );
			// returns selectedFunctionZid = Z10000
			store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10000' );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const block = wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__run-button' );
			const button = block.findComponent( { name: 'cdx-button' } );
			expect( button.exists() ).toBe( true );
			expect( button.attributes( 'disabled' ) ).toBe( 'true' );
		} );

		it( 'enables call function button when selected function has implementations', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			// returns selectedFunctionRowId = 2
			store.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2 } );
			// returns selectedFunctionZid = Z10000
			store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10000' );
			// returns implementations = [ 'Z10001', 'Z10002' ]
			store.getConnectedObjects = createGettersWithFunctionsMock( [ 'Z10001', 'Z10002' ] );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const block = wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__run-button' );
			const button = block.findComponent( { name: 'cdx-button' } );
			expect( button.exists() ).toBe( true );
			expect( button.attributes( 'disabled' ) ).toBe( 'false' );
		} );

		it( 'renders orchestration result block when there are results', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			wrapper.vm.resultRowId = 1;
			wrapper.vm.hasResult = true;

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const block = wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__result' );
			const component = block.findComponent( { name: 'wl-evaluation-result' } );
			expect( component.exists() ).toBe( true );
			expect( component.props( 'rowId' ) ).toBe( 1 );
		} );

		it( 'clears result when selected function changes', async () => {
			// Mock initializeResultId to return different values for function call and result
			store.initializeResultId.mockReturnValueOnce( 1 ); // First call for functionCallRowId
			store.initializeResultId.mockReturnValueOnce( 10 ); // Second call for resultRowId

			const wrapper = shallowMount( FunctionEvaluator, {
				props: { functionZid: 'Z12345' },
				global: { stubs: { WlWidgetBase: false } }
			} );

			// Set initial result state to verify it gets cleared
			wrapper.vm.hasResult = true;
			wrapper.vm.running = true;

			await wrapper.vm.$nextTick();
			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledWith(
				{ zids: [ 'Z12345' ] }
			) );
			await waitFor( () => expect( store.setZFunctionCallArguments ).toHaveBeenCalledWith(
				{ parentId: 1, functionZid: 'Z12345' }
			) );

			// Wait for initial loading
			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			// Verify that we have results before changing function
			expect( wrapper.vm.hasResult ).toBe( true );
			expect( wrapper.vm.running ).toBe( true );

			// Mock initializeResultId for the second initialization after prop change
			store.initializeResultId.mockReturnValueOnce( 11 ); // New functionCallRowId
			store.initializeResultId.mockReturnValueOnce( 12 ); // New resultRowId

			// Change functionZid prop to trigger watcher
			await wrapper.setProps( { functionZid: 'Z10000' } );

			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledWith(
				{ zids: [ 'Z10000' ] }
			) );
			await waitFor( () => expect( store.setZFunctionCallArguments ).toHaveBeenCalledWith(
				{ parentId: 12, functionZid: 'Z10000' }
			) );

			// Verify that the result was cleared when function changed
			expect( wrapper.vm.hasResult ).toBe( false );
			expect( wrapper.vm.running ).toBe( false );
			// Verify that initializeResultId was called to reset the result
			expect( store.initializeResultId ).toHaveBeenCalledWith( 10 );
		} );

		it( 'calls function call when click button', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			wrapper.vm.functionCallRowId = 1;
			wrapper.vm.resultRowId = 10;
			// mock initializeResultId to return a Promise
			store.initializeResultId.mockReturnValue( 10 );
			// activates function call button
			store.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2 } );
			store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10000' );
			store.getConnectedObjects = createGettersWithFunctionsMock( [ 'Z10001', 'Z10002' ] );
			// returns JSON function call
			store.getZObjectAsJsonById = createGettersWithFunctionsMock( functionCallJson );

			await wrapper.vm.$nextTick();

			const block = wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__run-button' );
			const button = block.findComponent( { name: 'cdx-button' } );

			button.trigger( 'click' );

			await waitFor( () => expect( store.callZFunction ).toHaveBeenCalledTimes( 1 ) );
			expect( store.callZFunction ).toHaveBeenCalledWith( {
				functionCall: functionCallJson,
				resultRowId: 10
			} );
		} );
	} );

	describe( 'in function details page', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( FunctionEvaluator, { props: { functionZid: 'Z10000' } } );
			expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget' ).exists() ).toBe( true );
		} );

		it( 'initializes detached objects', async () => {
			shallowMount( FunctionEvaluator, { props: { functionZid: 'Z10000' } } );

			await waitFor( () => expect( store.initializeResultId ).toHaveBeenCalledTimes( 2 ) );
			await waitFor( () => expect( store.changeType ).toHaveBeenCalledTimes( 1 ) );
		} );

		it( 'initializes the function arguments', async () => {
			// Set before mount
			store.initializeResultId.mockReturnValue( 10 );

			shallowMount( FunctionEvaluator, { props: { functionZid: 'Z10000' } } );

			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledTimes( 1 ) );
			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledWith(
				{ zids: [ 'Z10000' ] }
			) );
			await waitFor( () => expect( store.setZFunctionCallArguments ).toHaveBeenCalledWith(
				{ parentId: 10, functionZid: 'Z10000' }
			) );
		} );

		it( 'renders function page title', () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				props: { functionZid: 'Z10000' },
				global: { stubs: { WlWidgetBase: false } }
			} );

			expect( wrapper.find( '.ext-wikilambda-app-widget-base__header' ).text() ).toBe( 'Try this function' );
		} );

		it( 'does not render function call block', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				props: { functionZid: 'Z10000' },
				global: { stubs: { WlWidgetBase: false } }
			} );

			wrapper.vm.functionCallRowId = 1;
			await wrapper.vm.$nextTick();

			expect( wrapper.vm.forFunction ).toBe( true );
			expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__call' ).exists() ).toBe( false );
		} );

		it( 'renders no function selected message when function does not exist', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				props: { functionZid: 'Z10000' },
				global: { stubs: { WlWidgetBase: false } }
			} );

			// Mock conditions for empty state: function doesn't exist and not showing function selector
			store.getStoredObject = createGettersWithFunctionsMock( undefined );
			wrapper.vm.isLoading = false;

			await wrapper.vm.$nextTick();

			// Verify empty state message is displayed
			const message = wrapper.find( 'p' );
			expect( message.exists() ).toBe( true );
			expect( message.text() ).toContain( 'Select a function to try it.' );
		} );
	} );

	describe( 'in implementation page', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				props: { functionZid: 'Z10000', forImplementation: true }
			} );

			expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget' ).exists() ).toBe( true );
		} );

		it( 'renders a loader before function is loaded', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				props: { functionZid: 'Z10000', forImplementation: true },
				global: { stubs: { WlWidgetBase: false } }
			} );

			const loader = wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' );
			expect( loader.exists() ).toBe( true );
		} );

		it( 'initializes detached objects', async () => {
			shallowMount( FunctionEvaluator, {
				props: { functionZid: 'Z10000', forImplementation: true }
			} );

			await waitFor( () => expect( store.initializeResultId ).toHaveBeenCalledTimes( 2 ) );
			await waitFor( () => expect( store.changeType ).toHaveBeenCalledTimes( 1 ) );
		} );

		it( 'initializes the function arguments', async () => {
			// set before mount
			store.initializeResultId.mockReturnValue( 10 );

			shallowMount( FunctionEvaluator, {
				props: { functionZid: 'Z10000', forImplementation: true }
			} );

			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledTimes( 1 ) );
			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledWith(
				{ zids: [ 'Z10000' ] }
			) );
			await waitFor( () => expect( store.setZFunctionCallArguments ).toHaveBeenCalledWith(
				{ parentId: 10, functionZid: 'Z10000' }
			) );
		} );

		it( 'renders implementation page title', () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				props: { functionZid: 'Z10000', forImplementation: true },
				global: { stubs: { WlWidgetBase: false } }
			} );

			expect( wrapper.find( '.ext-wikilambda-app-widget-base__header' ).text() ).toBe( 'Try this implementation' );
		} );

		it( 'does not render function call block', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				props: { functionZid: 'Z10000', forImplementation: true },
				global: { stubs: { WlWidgetBase: false } }
			} );

			wrapper.vm.functionCallRowId = 1;
			await wrapper.vm.$nextTick();

			expect( wrapper.vm.forFunction ).toBe( true );
			expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__call' ).exists() ).toBe( false );
		} );

		it( 'calls implementation when click button', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				props: { functionZid: 'Z10000', forImplementation: true, contentRowId: 0 },
				global: { stubs: { WlWidgetBase: false } }
			} );

			wrapper.vm.functionCallRowId = 1;
			wrapper.vm.resultRowId = 10;
			// mock initializeResultId to return a Promise
			store.initializeResultId.mockReturnValue( 10 );
			// set getters to activate function call button
			store.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2 } );
			store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10000' );
			store.getConnectedObjects = createGettersWithFunctionsMock( [ 'Z10001', 'Z10002' ] );
			// returns function object from storage
			store.getStoredObject = createGettersWithFunctionsMock( functionJson );
			// returns JSON function call or implementation conditionally
			store.getZObjectAsJsonById = jest.fn( ( rowId ) => ( rowId === 0 ) ? contentJson :
				( rowId === 1 ) ? functionCallJson :
					undefined );

			// Wait for initial loading
			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const block = wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__run-button' );
			const button = block.findComponent( { name: 'cdx-button' } );
			button.trigger( 'click' );

			await waitFor( () => expect( store.callZFunction ).toHaveBeenCalledTimes( 1 ) );
			expect( store.callZFunction ).toHaveBeenCalledWith( {
				functionCall: implementationCall,
				resultRowId: 10
			} );
		} );

		it( 'renders no function selected message when function does not exist', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				props: { functionZid: 'Z10000', forImplementation: true },
				global: { stubs: { WlWidgetBase: false } }
			} );

			// Mock conditions for empty state: function doesn't exist and not showing function selector
			store.getStoredObject = createGettersWithFunctionsMock( undefined );
			wrapper.vm.isLoading = false;

			await wrapper.vm.$nextTick();

			// Verify empty state message is displayed for implementation
			const message = wrapper.find( 'p' );
			expect( message.exists() ).toBe( true );
			expect( message.text() ).toContain( 'Select a function to try this implementation.' );
		} );
	} );
} );
