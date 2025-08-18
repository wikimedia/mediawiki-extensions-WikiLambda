'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const FunctionInputLanguage = require( '../../../../../resources/ext.wikilambda.app/components/visualeditor/fields/FunctionInputLanguage.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );

describe( 'FunctionInputLanguage', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.fetchZids.mockResolvedValue();
		store.getStoredObject = jest.fn().mockImplementation( ( value ) => {
			// Z1003 returns valid language
			if ( value === 'Z1003' ) {
				return { Z1K1: 'Z2', Z2K2: { Z1K1: 'Z60', Z60K1: 'es' } };
			}
			// Z11 returns a valid non-language
			if ( value === 'Z11' ) {
				return { Z1K1: 'Z2', Z2K2: { Z1K1: 'Z4' } };
			}
			// Anything else returns undefined
			return undefined;
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionInputLanguage );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-language' ).exists() ).toBe( true );
	} );

	it( 'fetches suggested languages on initialization', () => {
		shallowMount( FunctionInputLanguage, {
			props: { value: '' }
		} );
		expect( store.fetchZids ).toHaveBeenCalledWith( { zids: Constants.SUGGESTIONS.LANGUAGES } );
	} );

	it( 'triggers validation on initialization, emits validate and no update', async () => {
		const wrapper = shallowMount( FunctionInputLanguage, {
			props: { value: 'Z1003' }
		} );

		// Wait for validation to finish
		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );

		// First, emits invalid (while validating), then emits valid
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: true } ] );
		// Update event is not emitted
		expect( wrapper.emitted().update ).toBeFalsy();
	} );

	it( 'emits input, update and validate events when a value is selected', async () => {
		const wrapper = shallowMount( FunctionInputLanguage, {
			props: { value: '' }
		} );

		// Emits validation result with empty value
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true } ] );

		// ACT: Simulate user selecting an entity
		wrapper.getComponent( { name: 'wl-z-object-selector' } ).vm.$emit( 'select-item', 'Z1003' );

		expect( wrapper.emitted().input[ 0 ] ).toEqual( [ 'Z1003' ] );
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: false } ] );

		// Wait for validation to finish
		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );

		expect( wrapper.emitted().validate[ 2 ] ).toEqual( [ { isValid: true } ] );
		expect( wrapper.emitted().update[ 0 ] ).toEqual( [ 'Z1003' ] );
	} );

	it( 'succeeds validation with empty value', () => {
		const wrapper = shallowMount( FunctionInputLanguage, {
			props: { value: '' }
		} );

		// Emits validation result synchronously
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true } ] );
	} );

	it( 'fails validation with non-zid value', () => {
		const wrapper = shallowMount( FunctionInputLanguage, {
			props: { value: 'en' }
		} );

		// Emits validation result synchronously
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ {
			isValid: false,
			errorMessage: 'No language chosen.'
		} ] );
	} );

	it( 'triggers async validation and fails for zid not found', async () => {
		const wrapper = shallowMount( FunctionInputLanguage, {
			props: { value: 'Z99999' }
		} );

		// Emits validate=false event before async validation
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );

		// Wait for validation to finish
		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );

		// Emits validation result once finished
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ {
			isValid: false,
			errorMessage: 'No language chosen.'
		} ] );
	} );

	it( 'triggers async validation and fails with non-language zid', async () => {
		const wrapper = shallowMount( FunctionInputLanguage, {
			props: { value: 'Z11' }
		} );

		// Emits validate=false event before async validation
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );

		// Wait for validation to finish
		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );

		// Emits validation result once finished
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ {
			isValid: false,
			errorMessage: 'No language chosen.'
		} ] );
	} );

	it( 'triggers async validation and succeeds with language zid', async () => {
		const wrapper = shallowMount( FunctionInputLanguage, {
			props: { value: 'Z1003' }
		} );

		// Emits validate=false event before async validation
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );

		// Wait for validation to finish
		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );

		// Emits validation result once finished
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: true } ] );
	} );
} );
