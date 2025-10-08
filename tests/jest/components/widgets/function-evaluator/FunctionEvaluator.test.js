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

const hybridFunctionCall = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10000' },
	Z10000K1: { Z1K1: 'Z6', Z6K1: 'pangolin' },
	Z10000K2: { Z1K1: 'Z6', Z6K1: 'armadillo' }
};

const storedImplementation = {
	Z1K1: 'Z14',
	Z14K3: {
		Z1K1: 'Z16',
		Z16K1: 'Z610',
		Z16K2: 'some buggy python code'
	}
};

const storedFunction = {
	Z2K1: { Z1K1: 'Z6', Z6K1: 'Z10000' },
	Z2K2: {
		Z1K1: 'Z8',
		Z8K4: [ 'Z14', 'Z10001', 'Z10002' ]
	}
};

const implementationCall = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: {
		Z1K1: 'Z8',
		Z8K4: [ 'Z14', {
			Z1K1: 'Z14',
			Z14K3: {
				Z1K1: 'Z16',
				Z16K1: 'Z610',
				Z16K2: 'some buggy python code'
			}
		} ]
	},
	Z10000K1: { Z1K1: 'Z6', Z6K1: 'pangolin' },
	Z10000K2: { Z1K1: 'Z6', Z6K1: 'armadillo' }
};

describe( 'FunctionEvaluator', () => {
	let store;

	/**
	 * Helper function to render FunctionEvaluator component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderFunctionEvaluator( props = {}, options = {} ) {
		const defaultOptions = {
			global: {
				stubs: {
					WlWidgetBase: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( FunctionEvaluator, { props, ...defaultOptions } );
	}

	beforeEach( () => {
		store = useMainStore();
		// Getters
		store.getErrors = createGettersWithFunctionsMock( [] );
		store.getCurrentZObjectId = 'Z12345';
		store.getCurrentZObjectType = 'Z14';
		store.getInputsOfFunctionZid = createGettersWithFunctionsMock( [] );
		store.getConnectedObjects = createGettersWithFunctionsMock( [] );
		store.getZObjectByKeyPath = createGettersWithFunctionsMock( hybridFunctionCall );
		store.getStoredObject = createGettersWithFunctionsMock();
		store.getLabelData = createLabelDataMock();
		store.getUserLangZid = 'Z1002';
		store.hasMetadataErrors = false;
		store.userCanRunFunction = true;
		store.userCanRunUnsavedCode = true;
		store.waitForRunningParsers = Promise.resolve();
		// Actions
		store.fetchZids.mockResolvedValue();
		store.callZFunction.mockResolvedValue();
	} );

	describe( 'in function call special page', () => {
		beforeEach( () => {
			const blankFunctionCall = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
				Z7K1: { Z1K1: 'Z9', Z9K1: '' }
			};
			store.getZObjectByKeyPath = createGettersWithFunctionsMock( blankFunctionCall );
		} );

		it( 'renders without errors', () => {
			const wrapper = renderFunctionEvaluator();

			expect( wrapper.get( '.ext-wikilambda-app-function-evaluator-widget' ).exists() ).toBe( true );
		} );

		it( 'initializes detached objects', () => {
			renderFunctionEvaluator();

			expect( store.setJsonObject ).toHaveBeenCalledTimes( 1 );
			expect( store.changeTypeByKeyPath ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'renders special page title', () => {
			const wrapper = renderFunctionEvaluator();

			expect( wrapper.get( '.ext-wikilambda-app-widget-base__header' ).text() ).toBe( 'Try a function' );
		} );

		it( 'renders function call block', async () => {
			const wrapper = renderFunctionEvaluator();

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const block = wrapper.get( '.ext-wikilambda-app-function-evaluator-widget__call' );
			const component = block.findComponent( { name: 'wl-z-object-key-value' } );
			expect( component.exists() ).toBe( true );
			expect( component.props( 'keyPath' ) ).toBe( 'call.Z7K1' );
		} );

		it( 'renders disabled function call button', async () => {
			const wrapper = renderFunctionEvaluator();

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const block = wrapper.get( '.ext-wikilambda-app-function-evaluator-widget__run-button' );
			const button = block.findComponent( { name: 'cdx-button' } );
			expect( button.exists() ).toBe( true );
			expect( button.attributes( 'disabled' ) ).toBe( 'true' );
		} );

		it( 'does not render inputs block', async () => {
			const wrapper = renderFunctionEvaluator();

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__inputs' ).exists() ).toBe( false );
		} );

		it( 'does not render orchestration result block', async () => {
			const wrapper = renderFunctionEvaluator();

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__result' ).exists() ).toBe( false );
		} );

		it( 'renders arguments when function is selected', async () => {
			store.getZObjectByKeyPath = createGettersWithFunctionsMock( hybridFunctionCall );

			const wrapper = renderFunctionEvaluator();

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			expect( wrapper.get( '.ext-wikilambda-app-function-evaluator-widget__inputs' ) ).toBeTruthy();
		} );

		it( 'renders inputs block when there are inputs to enter', async () => {
			store.getZObjectByKeyPath = createGettersWithFunctionsMock( hybridFunctionCall );

			const wrapper = renderFunctionEvaluator();

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const inputBlock = wrapper.get( '.ext-wikilambda-app-function-evaluator-widget__inputs' );

			const inputs = inputBlock.findAllComponents( { name: 'wl-z-object-key-value' } );
			expect( inputs.length ).toBe( 2 );
			expect( inputs[ 0 ].props( 'keyPath' ) ).toBe( 'call.Z10000K1' );
			expect( inputs[ 1 ].props( 'keyPath' ) ).toBe( 'call.Z10000K2' );
		} );

		it( 'renders disabled call function button when function has no implementations', async () => {
			store.getZObjectByKeyPath = createGettersWithFunctionsMock( hybridFunctionCall );
			store.getConnectedObjects = createGettersWithFunctionsMock( [] );

			const wrapper = renderFunctionEvaluator();

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const block = wrapper.get( '.ext-wikilambda-app-function-evaluator-widget__run-button' );
			const button = block.findComponent( { name: 'cdx-button' } );
			expect( button.exists() ).toBe( true );
			expect( button.attributes( 'disabled' ) ).toBe( 'true' );
		} );

		it( 'enables call function button when selected function has implementations', async () => {
			store.getZObjectByKeyPath = createGettersWithFunctionsMock( hybridFunctionCall );
			store.getConnectedObjects = createGettersWithFunctionsMock( [ 'Z10001', 'Z10002' ] );

			const wrapper = renderFunctionEvaluator();

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const block = wrapper.get( '.ext-wikilambda-app-function-evaluator-widget__run-button' );
			const button = block.findComponent( { name: 'cdx-button' } );
			expect( button.exists() ).toBe( true );
			expect( button.attributes( 'disabled' ) ).toBe( 'false' );
		} );

		it( 'renders orchestration result block when there are results', async () => {
			const wrapper = renderFunctionEvaluator();

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			// Simulate clicking the run button to trigger a function call
			const runButton = wrapper.get( '.ext-wikilambda-app-function-evaluator-widget__run-button' );
			const button = runButton.findComponent( { name: 'cdx-button' } );
			button.trigger( 'click' );

			// Wait for the result to be rendered
			await waitFor( () => {
				expect( wrapper.get( '.ext-wikilambda-app-function-evaluator-widget__result' ) ).toBeTruthy();
			} );

			const block = wrapper.get( '.ext-wikilambda-app-function-evaluator-widget__result' );
			const component = block.findComponent( { name: 'wl-evaluation-result' } );
			expect( component.exists() ).toBe( true );
		} );

		it( 'clears result when selected function changes', async () => {
			store.getZObjectByKeyPath = createGettersWithFunctionsMock( hybridFunctionCall );
			store.getConnectedObjects = createGettersWithFunctionsMock( [ 'Z10001', 'Z10002' ] );
			store.getStoredObject = createGettersWithFunctionsMock( storedFunction );
			// Mock the callZFunction with a delay to show the running state
			store.callZFunction.mockImplementation( () => new Promise( ( resolve ) => {
				setTimeout( () => resolve(), 100 );
			} ) );
			const wrapper = renderFunctionEvaluator( { functionZid: 'Z10000' } );

			// Wait for initial setup
			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z10000' ] } ) );
			await waitFor( () => expect( store.setFunctionCallArguments ).toHaveBeenCalledWith( {
				keyPath: [ 'call' ],
				functionZid: 'Z10000'
			} ) );

			// Wait for initial loading
			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			// No result block is rendered
			expect( wrapper.find( '[data-testid="function-evaluator-result"]' ).exists() ).toBe( false );

			// Trigger a function run to display results
			const runButton = wrapper.get( '[data-testid="evaluator-run-button"]' )
				.findComponent( { name: 'cdx-button' } );
			await runButton.trigger( 'click' );

			// Shows loader
			expect( wrapper.find( '[data-testid="function-evaluator-running"]' ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'wl-evaluation-result' } ).exists() ).toBe( false );

			await waitFor( () => expect( store.callZFunction ).toHaveBeenCalledTimes( 1 ) );

			// Wait for the result to be rendered and the loader to disappear
			await waitFor( () => {
				expect( wrapper.find( '[data-testid="function-evaluator-running"]' ).exists() ).toBe( false );
			} );
			expect( wrapper.findComponent( { name: 'wl-evaluation-result' } ).exists() ).toBe( true );

			// Now change the functionZid prop to trigger the watcher
			await wrapper.setProps( { functionZid: 'Z12345' } );

			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z12345' ] } ) );
			await waitFor( () => expect( store.setFunctionCallArguments ).toHaveBeenCalledWith( {
				keyPath: [ 'call' ],
				functionZid: 'Z12345'
			} ) );

			// Verify that the result block disappears when function changes
			await waitFor( () => {
				expect( wrapper.find( '[data-testid="function-evaluator-result"]' ).exists() ).toBe( false );
			} );
			expect( wrapper.find( '[data-testid="function-evaluator-running"]' ).exists() ).toBe( false );
			expect( wrapper.findComponent( { name: 'wl-evaluation-result' } ).exists() ).toBe( false );
		} );

		it( 'calls function call when click button', async () => {
			store.getZObjectByKeyPath = createGettersWithFunctionsMock( hybridFunctionCall );
			store.getConnectedObjects = createGettersWithFunctionsMock( [ 'Z10001', 'Z10002' ] );

			const wrapper = renderFunctionEvaluator();

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const block = wrapper.get( '.ext-wikilambda-app-function-evaluator-widget__run-button' );
			const button = block.findComponent( { name: 'cdx-button' } );

			button.trigger( 'click' );

			await waitFor( () => expect( store.callZFunction ).toHaveBeenCalledTimes( 1 ) );
			expect( store.callZFunction ).toHaveBeenCalledWith( {
				functionCall: hybridFunctionCall,
				resultKeyPath: [ 'response' ]
			} );
		} );
	} );

	describe( 'in function details page', () => {
		it( 'renders without errors', () => {
			const wrapper = renderFunctionEvaluator( { functionZid: 'Z10000', contentType: 'Z8' } );
			expect( wrapper.get( '.ext-wikilambda-app-function-evaluator-widget' ) ).toBeTruthy();
		} );

		it( 'initializes detached objects', () => {
			renderFunctionEvaluator( { functionZid: 'Z10000', contentType: 'Z8' } );

			expect( store.setJsonObject ).toHaveBeenCalledTimes( 1 );
			expect( store.changeTypeByKeyPath ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'initializes the function arguments', async () => {
			renderFunctionEvaluator( { functionZid: 'Z10000', contentType: 'Z8' } );

			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledTimes( 1 ) );
			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z10000' ] } ) );
			await waitFor( () => expect( store.setFunctionCallArguments ).toHaveBeenCalledWith( {
				keyPath: [ 'call' ],
				functionZid: 'Z10000'
			} ) );
		} );

		it( 'renders function page title', () => {
			const wrapper = renderFunctionEvaluator( { functionZid: 'Z10000', contentType: 'Z8' } );

			expect( wrapper.get( '.ext-wikilambda-app-widget-base__header' ).text() ).toBe( 'Try this function' );
		} );

		it( 'does not render function selector', async () => {
			const wrapper = renderFunctionEvaluator( { functionZid: 'Z10000', contentType: 'Z8' } );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__call' ).exists() ).toBe( false );
		} );

		it( 'renders no function selected message when function does not exist', async () => {
			const wrapper = renderFunctionEvaluator( { functionZid: 'Z10000', contentType: 'Z8' } );

			// Mock conditions for empty state: function doesn't exist and not showing function selector
			store.getStoredObject = createGettersWithFunctionsMock( undefined );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			// Verify empty state message is displayed
			const message = wrapper.get( 'p' );
			expect( message.exists() ).toBe( true );
			expect( message.text() ).toContain( 'Select a function to try it.' );
		} );
	} );

	describe( 'in implementation page', () => {
		it( 'renders without errors', () => {
			const wrapper = renderFunctionEvaluator( { functionZid: 'Z10000', contentType: 'Z14' } );

			expect( wrapper.get( '.ext-wikilambda-app-function-evaluator-widget' ) ).toBeTruthy();
		} );

		it( 'renders a loader before function is loaded', async () => {
			const wrapper = renderFunctionEvaluator( { functionZid: 'Z10000', contentType: 'Z14' } );

			const loader = wrapper.get( '.ext-wikilambda-app-function-evaluator-widget__loader' );
			expect( loader.exists() ).toBe( true );
		} );

		it( 'initializes detached objects', () => {
			renderFunctionEvaluator( { functionZid: 'Z10000', contentType: 'Z14' } );

			expect( store.setJsonObject ).toHaveBeenCalledTimes( 1 );
			expect( store.changeTypeByKeyPath ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'initializes the function arguments', async () => {
			renderFunctionEvaluator( { functionZid: 'Z10000', contentType: 'Z14' } );

			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledTimes( 1 ) );
			await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z10000' ] } ) );
			await waitFor( () => expect( store.setFunctionCallArguments ).toHaveBeenCalledWith( {
				keyPath: [ 'call' ],
				functionZid: 'Z10000'
			} ) );
		} );

		it( 'renders implementation page title', () => {
			const wrapper = renderFunctionEvaluator( { functionZid: 'Z10000', contentType: 'Z14' } );

			expect( wrapper.get( '.ext-wikilambda-app-widget-base__header' ).text() ).toBe( 'Try this implementation' );
		} );

		it( 'does not render function call block', async () => {
			const wrapper = renderFunctionEvaluator( { functionZid: 'Z10000', contentType: 'Z14' } );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__call' ).exists() ).toBe( false );
		} );

		it( 'calls implementation when click button', async () => {
			store.getConnectedObjects = createGettersWithFunctionsMock( [ 'Z10001', 'Z10002' ] );
			store.getStoredObject = createGettersWithFunctionsMock( storedFunction );
			store.getZObjectByKeyPath = ( path ) => ( path.join( '.' ) === 'call' ) ? hybridFunctionCall : storedImplementation;

			const wrapper = renderFunctionEvaluator( { functionZid: 'Z10000', contentType: 'Z14' } );

			// Wait for initial loading
			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			const block = wrapper.get( '.ext-wikilambda-app-function-evaluator-widget__run-button' );
			const button = block.findComponent( { name: 'cdx-button' } );
			button.trigger( 'click' );

			await waitFor( () => expect( store.callZFunction ).toHaveBeenCalledTimes( 1 ) );
			expect( store.callZFunction ).toHaveBeenCalledWith( {
				functionCall: implementationCall,
				resultKeyPath: [ 'response' ]
			} );
		} );

		it( 'renders no function selected message when function does not exist', async () => {
			const wrapper = renderFunctionEvaluator( { functionZid: 'Z10000', contentType: 'Z14' } );

			// Mock conditions for empty state: function doesn't exist and not showing function selector
			store.getStoredObject = createGettersWithFunctionsMock( undefined );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__loader' ).exists() ).toBe( false );
			} );

			// Verify empty state message is displayed for implementation
			const message = wrapper.get( 'p' );
			expect( message.exists() ).toBe( true );
			expect( message.text() ).toContain( 'Select a function to try this implementation.' );
		} );
	} );
} );
