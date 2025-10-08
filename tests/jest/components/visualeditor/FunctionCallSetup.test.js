'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const { createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const FunctionCallSetup = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/FunctionCallSetup.vue' );

describe( 'FunctionCallSetup', () => {
	let store;

	/**
	 * Helper function to render FunctionCallSetup component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderFunctionCallSetup( props = {}, options = {} ) {
		return shallowMount( FunctionCallSetup, {
			props,
			...options
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.validateVEFunctionId = false;
		store.getVEFunctionId = 'Z801';
		store.getLabelData = createLabelDataMock( { Z801: 'Echo' } );
	} );

	it( 'renders FunctionSelect when no valid function is selected', () => {
		const wrapper = renderFunctionCallSetup();

		expect( wrapper.findComponent( { name: 'wl-function-select' } ).exists() ).toBe( true );
		expect( wrapper.findComponent( { name: 'wl-function-input-setup' } ).exists() ).toBe( false );
	} );

	it( 'renders FunctionInputSetup when a valid function is selected', () => {
		store.validateVEFunctionId = true;
		const wrapper = renderFunctionCallSetup();

		expect( wrapper.findComponent( { name: 'wl-function-select' } ).exists() ).toBe( false );
		expect( wrapper.findComponent( { name: 'wl-function-input-setup' } ).exists() ).toBe( true );
	} );

	it( 'emits function-name-updated when functionLabelData changes', async () => {
		store.validateVEFunctionId = true;
		const wrapper = renderFunctionCallSetup();

		// Trigger the watcher by updating the mock store
		store.getLabelData = createLabelDataMock( { Z801: 'Test Function' } );

		await waitFor( () => {
			expect( wrapper.emitted( 'function-name-updated' )[ 0 ] ).toEqual( [ 'Test Function' ] );
		} );
	} );

	it( 'calls setVEFunctionId when selectFunction is triggered', () => {
		const wrapper = renderFunctionCallSetup();
		const mockSetVEFunctionId = jest.spyOn( store, 'setVEFunctionId' );

		// Simulate user selecting a function
		const functionSelect = wrapper.findComponent( { name: 'wl-function-select' } );
		functionSelect.vm.$emit( 'select', 'Z802' );
		expect( mockSetVEFunctionId ).toHaveBeenCalledWith( 'Z802' );
	} );

	it( 'calls setVEFunctionParams when selectFunction is triggered', () => {
		const wrapper = renderFunctionCallSetup();
		const mockSetVEFunctionParams = jest.spyOn( store, 'setVEFunctionParams' );

		// Simulate user selecting a function
		const functionSelect = wrapper.findComponent( { name: 'wl-function-select' } );
		functionSelect.vm.$emit( 'select', 'Z802' );
		// Called with Zero arguments to reset function params to blank state
		expect( mockSetVEFunctionParams ).toHaveBeenCalledWith();
	} );

	it( 'emits function-inputs-updated when updateFunctionInputs is triggered', () => {
		store.validateVEFunctionId = true;
		const wrapper = renderFunctionCallSetup();

		// Simulate user updating function inputs
		const functionInputSetup = wrapper.findComponent( { name: 'wl-function-input-setup' } );
		functionInputSetup.vm.$emit( 'update' );
		expect( wrapper.emitted( 'function-inputs-updated' ) ).toBeTruthy();
	} );
} );
