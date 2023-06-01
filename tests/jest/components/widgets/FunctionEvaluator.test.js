/*!
 * WikiLambda unit test suite for FunctionEvaluator Widget.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	{ waitFor } = require( '@testing-library/vue' ),
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionEvaluator = require( '../../../../resources/ext.wikilambda.edit/components/widgets/FunctionEvaluator.vue' );

describe( 'FunctionEvaluator', () => {
	var getters,
		actions;

	beforeEach( () => {
		getters = {
			getRowByKeyPath: createGettersWithFunctionsMock( undefined ),
			getZFunctionCallFunctionId: createGettersWithFunctionsMock( 'Z10000' ),
			getAttachedImplementations: createGettersWithFunctionsMock( [] ),
			getZObjectAsJsonById: createGettersWithFunctionsMock( '' ),
			getLabel: createGettersWithFunctionsMock( 'Function call' )
		};
		actions = {
			changeType: jest.fn(),
			initializeResultId: jest.fn()
		};
		global.store.hotUpdate( { getters: getters, actions: actions } );
	} );

	describe( 'Zero-blank state (no functionZid)', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( FunctionEvaluator );
			expect( wrapper.find( '.ext-wikilambda-function-evaluator' ).exists() ).toBe( true );
		} );
	} );

	describe( 'Initial value state', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( FunctionEvaluator, { functionZid: 'Z10000' } );
			expect( wrapper.find( '.ext-wikilambda-function-evaluator' ).exists() ).toBe( true );
		} );

		it( 'initializes detached objects', async () => {
			actions.initializeResultId = jest.fn();
			actions.changeType = jest.fn();
			global.store.hotUpdate( { getters: getters, actions: actions } );

			shallowMount( FunctionEvaluator );

			await waitFor( () => expect( actions.initializeResultId ).toHaveBeenCalledTimes( 2 ) );
			await waitFor( () => expect( actions.changeType ).toHaveBeenCalledTimes( 1 ) );
		} );

		it( 'renders empty function call block', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false, CdxCard: false } }
			} );

			wrapper.vm.functionCallRowId = 1;
			await wrapper.vm.$nextTick();

			const block = wrapper.find( '.ext-wikilambda-function-evaluator-call' );
			const component = block.findComponent( { name: 'wl-z-object-key-value' } );
			expect( component.exists() ).toBe( true );
			expect( component.props( 'rowId' ) ).toBe( 1 );
		} );

		it( 'renders empty orchestration result block', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false, CdxCard: false } }
			} );

			wrapper.vm.resultRowId = 1;
			wrapper.vm.hasResult = true;
			await wrapper.vm.$nextTick();

			const block = wrapper.find( '.ext-wikilambda-function-evaluator-result' );
			const component = block.findComponent( { name: 'wl-z-object-key-value' } );
			expect( component.exists() ).toBe( true );
			expect( component.props( 'rowId' ) ).toBe( 1 );
		} );

		it( 'renders buttons', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false, CdxCard: false } }
			} );

			expect( wrapper.find( '.ext-wikilambda-function-evaluator-clear-button' ).exists() ).toBe( true );
			expect( wrapper.find( '.ext-wikilambda-function-evaluator-clear-button' ).attributes( 'disabled' ) ).toBeDefined();
			expect( wrapper.find( '.ext-wikilambda-function-evaluator-run-button' ).exists() ).toBe( true );
			expect( wrapper.find( '.ext-wikilambda-function-evaluator-run-button' ).attributes( 'disabled' ) ).toBeDefined();
		} );

		it( 'enables clear button when there are results', async () => {
			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false, CdxCard: false } }
			} );

			wrapper.vm.resultRowId = 1;
			wrapper.vm.hasResult = true;
			await wrapper.vm.$nextTick();

			const button = wrapper.find( '.ext-wikilambda-function-evaluator-clear-button' );
			expect( button.exists() ).toBe( true );
			expect( button.attributes( 'disabled' ) ).toBeUndefined();
		} );

		it( 'enables call function button when there are implementations', async () => {
			getters.getAttachedImplementations = createGettersWithFunctionsMock( [ 'Z10001', 'Z10002' ] );
			global.store.hotUpdate( { getters: getters, actions: actions } );

			const wrapper = shallowMount( FunctionEvaluator, {
				global: { stubs: { WlWidgetBase: false, CdxCard: false } }
			} );

			wrapper.vm.resultRowId = 1;
			wrapper.vm.hasResult = true;
			await wrapper.vm.$nextTick();

			const button = wrapper.find( '.ext-wikilambda-function-evaluator-clear-button' );
			expect( button.exists() ).toBe( true );
			expect( button.attributes( 'disabled' ) ).toBeUndefined();
		} );
	} );
} );
