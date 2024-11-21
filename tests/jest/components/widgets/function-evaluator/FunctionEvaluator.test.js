/*!
 * WikiLambda unit test suite for FunctionEvaluator Widget.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	{ waitFor } = require( '@testing-library/vue' ),
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../../helpers/getterHelpers.js' ).createLabelDataMock,
	createGetterMock = require( '../../../helpers/getterHelpers.js' ).createGetterMock,
	FunctionEvaluator = require( '../../../../../resources/ext.wikilambda.app/components/widgets/function-evaluator/FunctionEvaluator.vue' );

describe( 'FunctionEvaluator', () => {
	let getters,
		actions;

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
		getters = {
			getErrors: createGettersWithFunctionsMock( [] ),
			getCurrentZObjectId: createGettersWithFunctionsMock( 'Z12345' ),
			getCurrentZObjectType: createGettersWithFunctionsMock( 'Z14' ),
			getStoredObject: createGettersWithFunctionsMock( undefined ),
			getZFunctionCallArguments: createGettersWithFunctionsMock( [] ),
			getRowByKeyPath: createGettersWithFunctionsMock( undefined ),
			getZFunctionCallFunctionId: createGettersWithFunctionsMock( undefined ),
			getConnectedObjects: createGettersWithFunctionsMock( [] ),
			getZObjectAsJsonById: createGettersWithFunctionsMock( '' ),
			getLabelData: createLabelDataMock(),
			getUserLangZid: createGettersWithFunctionsMock( 'Z1002' ),
			userCanRunFunction: createGetterMock( true ),
			userCanRunUnsavedCode: createGetterMock( true ),
			waitForRunningParsers: createGetterMock( Promise.resolve() ),
			getMetadataError: createGetterMock()
		};
		actions = {
			callZFunction: jest.fn(),
			clearErrors: jest.fn(),
			changeType: jest.fn(),
			fetchZids: jest.fn(),
			initializeResultId: jest.fn(),
			setValueByRowIdAndPath: jest.fn(),
			setZFunctionCallArguments: jest.fn()
		};
		global.store.hotUpdate( { getters: getters, actions: actions } );
	} );

	describe( 'in function call special page', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( FunctionEvaluator );

			expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget' ).exists() ).toBe( true );
		} );

		it( 'initializes detached objects', async () => {
			shallowMount( FunctionEvaluator );

			await waitFor( () => expect( actions.initializeResultId ).toHaveBeenCalledTimes( 2 ) );
			await waitFor( () => expect( actions.changeType ).toHaveBeenCalledTimes( 1 ) );
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
			getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2 } );
			global.store.hotUpdate( { getters: getters, actions: actions } );

			await wrapper.vm.$nextTick();

			const block = wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__call' );
			const component = block.findComponent( { name: 'wl-z-reference' } );
			expect( component.exists() ).toBe( true );
			expect( component.props( 'rowId' ) ).toBe( 2 );
		} );

		it( 'renders disabled function call button', () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			const block = wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__run-button' );
			const button = block.findComponent( { name: 'cdx-button' } );
			expect( button.exists() ).toBe( true );
			expect( button.attributes( 'disabled' ) ).toBe( 'true' );
		} );

		it( 'does not render inputs block', () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__inputs' ).exists() ).toBe( false );
		} );

		it( 'does not render orchestration result block', () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			expect( wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__result' ).exists() ).toBe( false );
		} );

		it( 'renders arguments when function is selected', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			wrapper.vm.functionCallRowId = 1;
			// returns selectedFunctionRowId = 2
			getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2 } );
			global.store.hotUpdate( { getters: getters, actions: actions } );

			const functionSelector = wrapper.getComponent( { name: 'wl-z-reference' } );
			expect( functionSelector.exists() ).toBeTruthy();
			await functionSelector.vm.$emit( 'set-value', { value: 'Z10000', keyPath: [ 'Z9K1' ] } );

			expect( actions.setZFunctionCallArguments ).toHaveBeenCalledWith( expect.anything(), {
				functionZid: 'Z10000',
				parentId: 1
			} );
			expect( actions.setValueByRowIdAndPath ).toHaveBeenCalledWith( expect.anything(), {
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
			getters.getZFunctionCallArguments = createGettersWithFunctionsMock( [
				{ key: 'Z10000K1', id: 4, parent: 1 },
				{ key: 'Z10000K2', id: 5, parent: 1 }
			] );
			global.store.hotUpdate( { getters: getters, actions: actions } );

			await wrapper.vm.$nextTick();

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
			getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2 } );
			// returns selectedFunctionZid = Z10000
			getters.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10000' );
			global.store.hotUpdate( { getters: getters, actions: actions } );

			await wrapper.vm.$nextTick();

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
			getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2 } );
			// returns selectedFunctionZid = Z10000
			getters.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10000' );
			// returns implementations = [ 'Z10001', 'Z10002' ]
			getters.getConnectedObjects = createGettersWithFunctionsMock( [ 'Z10001', 'Z10002' ] );
			global.store.hotUpdate( { getters: getters, actions: actions } );

			await wrapper.vm.$nextTick();

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

			await wrapper.vm.$nextTick();

			const block = wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__result' );
			const component = block.findComponent( { name: 'wl-evaluation-result' } );
			expect( component.exists() ).toBe( true );
			expect( component.props( 'rowId' ) ).toBe( 1 );
		} );

		it( 'clears result when selected function changes', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			wrapper.vm.functionCallRowId = 1;
			wrapper.vm.resultRowId = 10;
			wrapper.vm.hasResult = true;
			wrapper.vm.running = true;
			actions.initializeResultId = jest.fn();
			// returns selectedFunctionZid = Z10000
			getters.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10000' );
			global.store.hotUpdate( { getters: getters, actions: actions } );

			await wrapper.vm.$nextTick();

			expect( wrapper.vm.resultRowId ).toBe( 10 );
			expect( wrapper.vm.hasResult ).toBe( false );
			expect( wrapper.vm.running ).toBe( false );
			expect( actions.initializeResultId ).toHaveBeenCalledWith( expect.anything(), 10 );
		} );

		it( 'calls function call when click button', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false } }
			} );

			wrapper.vm.functionCallRowId = 1;
			wrapper.vm.resultRowId = 10;
			// mock initializeResultId to return a Promise
			actions.initializeResultId = () => Promise.resolve( 10 );
			// activates function call button
			getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2 } );
			getters.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10000' );
			getters.getConnectedObjects = createGettersWithFunctionsMock( [ 'Z10001', 'Z10002' ] );
			// returns JSON function call
			getters.getZObjectAsJsonById = createGettersWithFunctionsMock( functionCallJson );
			global.store.hotUpdate( { getters: getters, actions: actions } );

			await wrapper.vm.$nextTick();

			const block = wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__run-button' );
			const button = block.findComponent( { name: 'cdx-button' } );

			button.trigger( 'click' );

			await waitFor( () => expect( actions.callZFunction ).toHaveBeenCalledTimes( 1 ) );
			expect( actions.callZFunction ).toHaveBeenCalledWith( expect.anything(), {
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

			await waitFor( () => expect( actions.initializeResultId ).toHaveBeenCalledTimes( 2 ) );
			await waitFor( () => expect( actions.changeType ).toHaveBeenCalledTimes( 1 ) );
		} );

		it( 'initializes the function arguments', async () => {
			// Set before mount
			actions.initializeResultId = () => Promise.resolve( 10 );
			global.store.hotUpdate( { getters: getters, actions: actions } );

			shallowMount( FunctionEvaluator, { props: { functionZid: 'Z10000' } } );

			await waitFor( () => expect( actions.fetchZids ).toHaveBeenCalledTimes( 1 ) );
			await waitFor( () => expect( actions.fetchZids ).toHaveBeenCalledWith( expect.anything(),
				{ zids: [ 'Z10000' ] }
			) );
			await waitFor( () => expect( actions.setZFunctionCallArguments ).toHaveBeenCalledWith( expect.anything(),
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

			await waitFor( () => expect( actions.initializeResultId ).toHaveBeenCalledTimes( 2 ) );
			await waitFor( () => expect( actions.changeType ).toHaveBeenCalledTimes( 1 ) );
		} );

		it( 'initializes the function arguments', async () => {
			// set before mount
			actions.initializeResultId = () => Promise.resolve( 10 );
			global.store.hotUpdate( { getters: getters, actions: actions } );

			shallowMount( FunctionEvaluator, {
				props: { functionZid: 'Z10000', forImplementation: true }
			} );

			await waitFor( () => expect( actions.fetchZids ).toHaveBeenCalledTimes( 1 ) );
			await waitFor( () => expect( actions.fetchZids ).toHaveBeenCalledWith( expect.anything(),
				{ zids: [ 'Z10000' ] }
			) );
			await waitFor( () => expect( actions.setZFunctionCallArguments ).toHaveBeenCalledWith( expect.anything(),
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
			actions.initializeResultId = () => Promise.resolve( 10 );
			// set getters to activate function call button
			getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2 } );
			getters.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10000' );
			getters.getConnectedObjects = createGettersWithFunctionsMock( [ 'Z10001', 'Z10002' ] );
			// returns function object from storage
			getters.getStoredObject = createGettersWithFunctionsMock( functionJson );
			// returns JSON function call or implementation conditionally
			getters.getZObjectAsJsonById = () => ( rowId ) => ( rowId === 0 ) ? contentJson :
				( rowId === 1 ) ? functionCallJson :
					undefined;
			global.store.hotUpdate( { getters: getters, actions: actions } );

			await wrapper.vm.$nextTick();

			const block = wrapper.find( '.ext-wikilambda-app-function-evaluator-widget__run-button' );
			const button = block.findComponent( { name: 'cdx-button' } );
			button.trigger( 'click' );

			await waitFor( () => expect( actions.callZFunction ).toHaveBeenCalledTimes( 1 ) );
			expect( actions.callZFunction ).toHaveBeenCalledWith( expect.anything(), {
				functionCall: implementationCall,
				resultRowId: 10
			} );
		} );
	} );
} );
