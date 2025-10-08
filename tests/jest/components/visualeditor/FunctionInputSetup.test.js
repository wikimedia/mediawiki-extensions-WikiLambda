'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const FunctionInputSetup = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/FunctionInputSetup.vue' );

describe( 'FunctionInputSetup', () => {
	let store;

	/**
	 * Helper function to render FunctionInputSetup component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderFunctionInputSetup( props = {}, options = {} ) {
		return shallowMount( FunctionInputSetup, { props, ...options } );
	}

	beforeEach( () => {
		mw.language.getFallbackLanguageChain = () => [ 'en' ];

		store = useMainStore();
		store.getUserLangCode = 'en';
		store.getVEFunctionId = 'Z13546';
		store.getOutputTypeOfFunctionZid = createGettersWithFunctionsMock( 'Z6' );
		store.getInputsOfFunctionZid = createGettersWithFunctionsMock( [
			{ Z1K1: 'Z17', Z17K1: 'Z13518', Z17K2: 'Z13546K1' },
			{ Z1K1: 'Z17', Z17K1: 'Z13518', Z17K2: 'Z13546K2' }
		] );
		store.getDescription = createLabelDataMock( { Z13546: 'Test description' } );
		store.getLabelData = createLabelDataMock( {
			Z13546: 'Function name',
			Z13546K1: 'first',
			Z13546K2: 'second'
		} );
		store.fetchZids.mockResolvedValue();
	} );

	it( 'renders without errors', async () => {
		const wrapper = renderFunctionInputSetup();

		expect( wrapper.find( '.ext-wikilambda-app-function-input-setup' ).exists() ).toBe( true );
		expect( wrapper.findComponent( { name: 'wl-expandable-description' } ).exists() ).toBe( true );

		await waitFor( () => {
			expect( wrapper.findAllComponents( { name: 'wl-function-input-field' } ).length ).toEqual( 2 );
		} );
	} );

	it( 'emits update event when input value changes', async () => {
		const wrapper = renderFunctionInputSetup();

		await waitFor( () => expect( wrapper.findAllComponents( { name: 'wl-function-input-field' } ).length ).toEqual( 2 ) );

		await wrapper.findComponent( { name: 'wl-function-input-field' } ).vm.$emit( 'update', 'new value' );

		expect( store.setVEFunctionParam ).toHaveBeenCalledWith( 0, 'new value' );
		expect( store.setVEFunctionParamsDirty ).toHaveBeenCalledWith();
		expect( wrapper.emitted().update ).toBeTruthy();
	} );

	it( 'initializes input values on mount', async () => {
		store.getVEFunctionParams = [ 'value1' ];

		const wrapper = renderFunctionInputSetup();

		await waitFor( () => expect( wrapper.findAllComponents( { name: 'wl-function-input-field' } ).length ).toEqual( 2 ) );

		expect( store.setVEFunctionParam ).toHaveBeenCalledWith( 1, '' );

		// Check that the input fields are rendered with correct props
		const fields = wrapper.findAllComponents( { name: 'wl-function-input-field' } );
		expect( fields.length ).toBe( 2 );

		// Check first field configuration
		expect( fields.at( 0 ).props( 'modelValue' ) ).toBe( 'value1' );
		expect( fields.at( 0 ).props( 'inputType' ) ).toBe( 'Z13518' );
		expect( fields.at( 0 ).props( 'showValidation' ) ).toBe( false );

		// Check second field configuration
		expect( fields.at( 1 ).props( 'modelValue' ) ).toBe( '' );
		expect( fields.at( 1 ).props( 'inputType' ) ).toBe( 'Z13518' );
		expect( fields.at( 1 ).props( 'showValidation' ) ).toBe( false );
	} );

	it( 'renders pre-filled input values from VisualEditor', async () => {
		store.getVEFunctionParams = [ 'value1', 'value2' ];

		const wrapper = renderFunctionInputSetup();

		await waitFor( () => expect( wrapper.findAllComponents( { name: 'wl-function-input-field' } ).length ).toEqual( 2 ) );

		const fields = wrapper.findAllComponents( { name: 'wl-function-input-field' } );

		// Check first field configuration
		expect( fields.at( 0 ).props( 'modelValue' ) ).toBe( 'value1' );
		expect( fields.at( 0 ).props( 'inputType' ) ).toBe( 'Z13518' );
		expect( fields.at( 0 ).props( 'showValidation' ) ).toBe( false );

		// Check second field configuration
		expect( fields.at( 1 ).props( 'modelValue' ) ).toBe( 'value2' );
		expect( fields.at( 1 ).props( 'inputType' ) ).toBe( 'Z13518' );
		expect( fields.at( 1 ).props( 'showValidation' ) ).toBe( false );
	} );

	it( 'validates input fields and updates validity state', async () => {
		const wrapper = renderFunctionInputSetup();

		await waitFor( () => expect( wrapper.findAllComponents( { name: 'wl-function-input-field' } ).length ).toEqual( 2 ) );

		const fields = wrapper.findAllComponents( { name: 'wl-function-input-field' } );
		await fields.at( 0 ).vm.$emit( 'validate', { isValid: true } );
		await fields.at( 1 ).vm.$emit( 'validate', { isValid: true } );

		expect( store.setVEFunctionParamsValid ).toHaveBeenCalledWith( true );
		expect( wrapper.emitted().update ).toBeTruthy();
	} );

	describe( 'Language fallback strategy', () => {
		it( 'shows no missing content notice when all labels are in userlang', () => {
			const wrapper = renderFunctionInputSetup();
			expect( wrapper.findComponent( { name: 'cdx-message' } ).exists() ).toBe( false );
		} );

		it( 'shows missing content notice when labels are in fallback lang', () => {
			mw.language.getFallbackLanguageChain = () => [ 'es', 'en' ];
			const wrapper = renderFunctionInputSetup();
			expect( wrapper.findComponent( { name: 'cdx-message' } ).exists() ).toBe( true );
		} );

		it( 'shows missing content notice when labels are in other language', () => {
			mw.language.getFallbackLanguageChain = () => [ 'zh' ];
			const wrapper = renderFunctionInputSetup();
			expect( wrapper.findComponent( { name: 'cdx-message' } ).exists() ).toBe( true );
		} );

		it( 'shows missing content notice when there are no labels', () => {
			mw.language.getFallbackLanguageChain = () => [ 'en' ];
			store.getDescription = createLabelDataMock();
			store.getLabelData = createLabelDataMock();

			const wrapper = renderFunctionInputSetup();
			expect( wrapper.findComponent( { name: 'cdx-message' } ).exists() ).toBe( true );
		} );
	} );
} );
