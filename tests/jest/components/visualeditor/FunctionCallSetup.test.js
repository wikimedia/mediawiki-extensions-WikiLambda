'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const FunctionCallSetup = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/FunctionCallSetup.vue' );

describe( 'FunctionCallSetup', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.validateVEFunctionId = false;
		store.getVEFunctionId = 'Z801';
		store.getLabelData = createLabelDataMock( { Z801: 'Echo' } );
	} );

	it( 'renders FunctionSelect when no valid function is selected', () => {
		const wrapper = shallowMount( FunctionCallSetup );

		expect( wrapper.findComponent( { name: 'wl-function-select' } ).exists() ).toBe( true );
		expect( wrapper.findComponent( { name: 'wl-function-input-setup' } ).exists() ).toBe( false );
	} );

	it( 'renders FunctionInputSetup when a valid function is selected', () => {
		store.validateVEFunctionId = true;
		const wrapper = shallowMount( FunctionCallSetup );

		expect( wrapper.findComponent( { name: 'wl-function-select' } ).exists() ).toBe( false );
		expect( wrapper.findComponent( { name: 'wl-function-input-setup' } ).exists() ).toBe( true );
	} );

	it( 'emits function-name-updated when functionLabelData changes', async () => {
		store.validateVEFunctionId = true;
		const wrapper = shallowMount( FunctionCallSetup );

		// Trigger the watcher by updating the mock store
		store.getLabelData = createLabelDataMock( { Z801: 'Test Function' } );

		await wrapper.vm.$nextTick();
		expect( wrapper.emitted( 'function-name-updated' )[ 0 ] ).toEqual( [ 'Test Function' ] );
	} );

	it( 'calls setVEFunctionId when selectFunction is triggered', () => {
		const wrapper = shallowMount( FunctionCallSetup );
		const mockSetVEFunctionId = jest.spyOn( store, 'setVEFunctionId' );

		wrapper.vm.selectFunction( 'Z802' );
		expect( mockSetVEFunctionId ).toHaveBeenCalledWith( 'Z802' );
	} );

	it( 'calls setVEFunctionParams when selectFunction is triggered', () => {
		const wrapper = shallowMount( FunctionCallSetup );
		const mockSetVEFunctionParams = jest.spyOn( store, 'setVEFunctionParams' );

		wrapper.vm.selectFunction( 'Z802' );
		// Called with Zero arguments to reset function params to blank state
		expect( mockSetVEFunctionParams ).toHaveBeenCalledWith();
	} );

	it( 'emits function-inputs-updated when updateFunctionInputs is triggered', () => {
		const wrapper = shallowMount( FunctionCallSetup );

		wrapper.vm.updateFunctionInputs();
		expect( wrapper.emitted( 'function-inputs-updated' ) ).toBeTruthy();
	} );
} );
