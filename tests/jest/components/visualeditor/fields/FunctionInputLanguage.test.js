'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const FunctionInputLanguage = require( '../../../../../resources/ext.wikilambda.app/components/visualeditor/fields/FunctionInputLanguage.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const ErrorData = require( '../../../../../resources/ext.wikilambda.app/store/classes/ErrorData.js' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../../helpers/getterHelpers.js' );

describe( 'FunctionInputLanguage', () => {
	const errorLang = new ErrorData( 'wikilambda-visualeditor-wikifunctionscall-error-language', [], null, 'error' );

	let store;

	// Helper function to render FunctionInputLanguage with common configuration
	const renderFunctionInputLanguage = ( props = {}, options = {} ) => {
		const defaultProps = {
			inputType: 'Z60',
			value: ''
		};
		const defaultOptions = {
			global: {
				stubs: {
					CdxField: false,
					CdxLabel: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( FunctionInputLanguage, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	};

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
		store.getDefaultValueForType = createGettersWithFunctionsMock( 'Z1002' );
		store.getLabelData = createLabelDataMock( { Z1002: 'English' } );
		store.hasDefaultValueForType = createGettersWithFunctionsMock( false );
		// Mock isNewParameterSetup to false for tests that expect auto-checking behavior
		store.isNewParameterSetup = false;
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionInputLanguage();
		expect( wrapper.find( '.ext-wikilambda-app-function-input-language' ).exists() ).toBe( true );
	} );

	it( 'fetches suggested languages on initialization', () => {
		renderFunctionInputLanguage( { value: '' } );
		expect( store.fetchZids ).toHaveBeenCalledWith( { zids: Constants.SUGGESTIONS.LANGUAGES } );
	} );

	it( 'triggers validation on initialization, emits validate and no update', async () => {
		const wrapper = renderFunctionInputLanguage( {
			value: 'Z1003'
		} );

		// Wait for validation to complete
		await waitFor( () => expect( wrapper.emitted().validate.length ).toBe( 2 ) );

		// First, emits invalid (while validating), then emits valid
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: true } ] );
		// Update event is not emitted
		expect( wrapper.emitted().update ).toBeFalsy();
	} );

	it( 'emits input, update and validate events when a value is selected', async () => {
		const wrapper = renderFunctionInputLanguage( {
			value: ''
		} );

		// Emits validation result with empty value
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true } ] );

		// ACT: Simulate user selecting an entity
		wrapper.getComponent( { name: 'wl-z-object-selector' } ).vm.$emit( 'select-item', 'Z1003' );

		expect( wrapper.emitted().input[ 0 ] ).toEqual( [ 'Z1003' ] );
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: false } ] );

		// Wait for validation to complete
		await waitFor( () => expect( wrapper.emitted().validate.length ).toBe( 3 ) );

		expect( wrapper.emitted().validate[ 2 ] ).toEqual( [ { isValid: true } ] );
		expect( wrapper.emitted().update[ 0 ] ).toEqual( [ 'Z1003' ] );
	} );

	it( 'succeeds validation with empty value', () => {
		const wrapper = renderFunctionInputLanguage( {
			value: ''
		} );

		// Emits validation result synchronously
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true } ] );
	} );

	it( 'fails validation with non-zid value', () => {
		const wrapper = renderFunctionInputLanguage( {
			value: 'en'
		} );

		// Emits validation result synchronously
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ {
			isValid: false,
			error: errorLang
		} ] );
	} );

	it( 'triggers async validation and fails for zid not found', async () => {
		const wrapper = renderFunctionInputLanguage( {
			value: 'Z99999'
		} );

		// Emits validate=false event before async validation
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );

		// Wait for validation to complete
		await waitFor( () => expect( wrapper.emitted().validate.length ).toBe( 2 ) );

		// Emits validation result once finished
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ {
			isValid: false,
			error: errorLang
		} ] );
	} );

	it( 'triggers async validation and fails with non-language zid', async () => {
		const wrapper = renderFunctionInputLanguage( {
			value: 'Z11'
		} );

		// Emits validate=false event before async validation
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );

		// Wait for validation to complete
		await waitFor( () => expect( wrapper.emitted().validate.length ).toBe( 2 ) );

		// Emits validation result once finished
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ {
			isValid: false,
			error: errorLang
		} ] );
	} );

	it( 'triggers async validation and succeeds with language zid', async () => {
		const wrapper = renderFunctionInputLanguage( {
			value: 'Z1003'
		} );

		// Emits validate=false event before async validation
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );

		// Wait for validation to complete
		await waitFor( () => expect( wrapper.emitted().validate.length ).toBe( 2 ) );

		// Emits validation result once finished
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: true } ] );
	} );

	describe( 'default value functionality', () => {
		it( 'shows default value label as placeholder when shouldUseDefaultValue is true', () => {
			const wrapper = renderFunctionInputLanguage( {
				shouldUseDefaultValue: true,
				defaultValue: 'Z1002'
			} );

			expect( wrapper.vm.placeholder ).toBe( 'English' );
		} );

		it( 'shows empty placeholder when shouldUseDefaultValue is false', () => {
			const wrapper = renderFunctionInputLanguage( {
				shouldUseDefaultValue: false
			} );

			expect( wrapper.vm.placeholder ).toBe( '' );
		} );

		it( 're-validates input when shouldUseDefaultValue prop changes', async () => {
			const wrapper = renderFunctionInputLanguage( {
				value: '',
				shouldUseDefaultValue: false,
				hasDefaultValue: true
			} );

			// Wait for initial validation to finish
			await waitFor( () => expect( wrapper.emitted().validate ).toBeTruthy() );

			// Initially invalid because empty value and default value is available
			expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false, error: errorLang } ] );

			// Change shouldUseDefaultValue to true
			await wrapper.setProps( { shouldUseDefaultValue: true } );

			// Should re-validate and become valid (when shouldUseDefaultValue is true, field is valid)
			expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: true } ] );

			// Change shouldUseDefaultValue back to false
			await wrapper.setProps( { shouldUseDefaultValue: false } );

			// Should re-validate and become invalid again
			expect( wrapper.emitted().validate[ 2 ] ).toEqual( [ { isValid: false, error: errorLang } ] );
		} );
	} );
} );
