'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const FunctionInputParser = require( '../../../../../resources/ext.wikilambda.app/components/visualeditor/fields/FunctionInputParser.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const ErrorData = require( '../../../../../resources/ext.wikilambda.app/store/classes/ErrorData.js' );
const { createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' );

describe( 'FunctionInputParser', () => {
	let store;
	const typeZid = 'Z30000';
	const parserZid = 'Z30020';
	const errorParser = new ErrorData( 'wikilambda-visualeditor-wikifunctionscall-error-parser-empty', [], null, 'error' );
	const gregorianCalendarDateZid = 'Z20420';

	// Helper function to render FunctionInputParser with common configuration
	const renderFunctionInputParser = ( props = {}, options = {} ) => {
		const defaultProps = {
			inputType: typeZid,
			value: 'Test value'
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
		return shallowMount( FunctionInputParser, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	};

	beforeEach( () => {
		store = useMainStore();
		store.getParserZid = createGettersWithFunctionsMock( parserZid );
		store.getUserLangZid = 'Z1002';
		store.runParser.mockResolvedValue( {
			response: {
				Z1K1: 'Z22',
				Z22K1: {
					Z1K1: typeZid,
					[ `${ typeZid }K1` ]: 'Returned value'
				}
			},
			resolver: { resolve: jest.fn() }

		} );
		store.getTestResults.mockResolvedValue();
		store.getDefaultValueForType = createGettersWithFunctionsMock( '02-03-2020' );
		store.hasDefaultValueForType = createGettersWithFunctionsMock( false );
		// Mock isNewParameterSetup to false for tests that expect auto-checking behavior
		store.isNewParameterSetup = false;
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionInputParser();
		expect( wrapper.getComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
	} );

	it( 'emits input event when value changes', () => {
		const wrapper = renderFunctionInputParser();
		wrapper.getComponent( { name: 'cdx-text-input' } ).vm.$emit( 'update:model-value', 'New value' );
		expect( wrapper.emitted().input[ 0 ] ).toEqual( [ 'New value' ] );
	} );

	it( 'validates on mount with non-empty value', async () => {
		const wrapper = renderFunctionInputParser( {
			value: 'Non empty value'
		} );

		// Wait for initial validation to complete
		await waitFor( () => expect( wrapper.vm.isParserRunning ).toBe( false ) );
		expect( store.runParser ).toHaveBeenCalledWith( {
			parserZid: 'Z30020',
			wait: true,
			zlang: 'Z1002',
			zobject: 'Non empty value',
			signal: expect.any( Object )
		} );
	} );

	it( 'validates on mount with empty value', async () => {
		const wrapper = renderFunctionInputParser( {
			value: ''
		} );

		// Wait for validation to complete
		await waitFor( () => expect( wrapper.emitted().validate.length ).toBe( 2 ) );

		// Should call the parser
		expect( store.runParser ).toHaveBeenCalledWith( {
			parserZid: 'Z30020',
			wait: true,
			zlang: 'Z1002',
			zobject: '',
			signal: expect.any( Object )
		} );
	} );

	it( 'on model update, debounces validation and emits validate event if succeeds', async () => {
		// Use fake timers to test debounce
		jest.useFakeTimers();

		const wrapper = renderFunctionInputParser();

		// Wait for initial validation of input value:
		await waitFor( () => expect( wrapper.emitted().validate ).toBeTruthy() );

		// Check that the initial validation event was emitted
		expect( wrapper.emitted().validate.length ).toBe( 1 );

		// Update field, simulate multiple keystrokes
		const input = wrapper.getComponent( { name: 'cdx-text-input' } );
		input.vm.$emit( 'update:model-value', 'New va' );
		input.vm.$emit( 'update:model-value', 'New val' );
		input.vm.$emit( 'update:model-value', 'New valu' );
		input.vm.$emit( 'update:model-value', 'New value' );

		// Advance timer 100ms, nothing should have happened
		jest.advanceTimersByTime( 100 );

		// Check that no new validation events were emitted yet
		expect( wrapper.emitted().validate.length ).toBe( 1 );

		// Advance timer 1000ms, validation should have started
		jest.advanceTimersByTime( 1000 );

		// Wait for validation to complete
		await waitFor( async () => expect( wrapper.emitted().validate.length ).toBe( 3 ) );

		expect( store.runParser ).toHaveBeenCalledWith( {
			parserZid: 'Z30020',
			wait: true,
			zlang: 'Z1002',
			zobject: 'New value',
			signal: expect.any( Object )
		} );
	} );

	it( 'emits validate event with error message on validation failure', async () => {
		store.runParser.mockRejectedValue( new Error( 'Invalid value' ) );

		const wrapper = renderFunctionInputParser( {
			value: 'Invalid value'
		} );

		// Initial state: no progress indicator
		expect( wrapper.find( '.ext-wikilambda-app-function-input-parser__progress-indicator' ).exists() ).toBe( false );

		// Wait for initial validation to complete
		await waitFor( () => expect( wrapper.emitted().validate ).toBeTruthy() );

		// Update the input to trigger validation
		const input = wrapper.getComponent( { name: 'cdx-text-input' } );
		input.vm.$emit( 'update:model-value', 'Invalid value' );

		// Progress indicator should appear
		expect( wrapper.find( '.ext-wikilambda-app-function-input-parser__progress-indicator' ).exists() ).toBe( true );

		// Wait for validation to complete
		await waitFor( async () => expect( wrapper.emitted().validate.length ).toBe( 2 ) );

		expect( store.runParser ).toHaveBeenCalledWith( {
			parserZid: 'Z30020',
			wait: true,
			zlang: 'Z1002',
			zobject: 'Invalid value',
			signal: expect.any( Object )
		} );
		// First, emits invalid (while validating), then emits invalid with error
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: false, error: expect.any( Object ) } ] );
		// Progress indicator should disappear
		expect( wrapper.find( '.ext-wikilambda-app-function-input-parser__progress-indicator' ).exists() ).toBe( false );
	} );

	it( 'shows progress indicator while parser is running', async () => {
		const wrapper = renderFunctionInputParser();

		// Trigger validation by updating the input
		const input = wrapper.getComponent( { name: 'cdx-text-input' } );
		input.vm.$emit( 'update:model-value', 'Test value' );

		// Wait for the progress indicator to appear
		await waitFor( () => expect( wrapper.find( '.ext-wikilambda-app-function-input-parser__progress-indicator' ).exists() ).toBe( true ) );

		// Wait for validation to complete
		await waitFor( () => expect( wrapper.emitted().validate.length ).toBe( 2 ) );

		// Progress indicator should disappear
		expect( wrapper.find( '.ext-wikilambda-app-function-input-parser__progress-indicator' ).exists() ).toBe( false );
	} );

	describe( 'allowed empty types', () => {
		it( 'validates successfully an empty value for gregorian calendar date', async () => {
			const wrapper = renderFunctionInputParser( {
				inputType: gregorianCalendarDateZid,
				value: ''
			} );

			// Wait for validation to complete
			await waitFor( () => expect( wrapper.emitted().validate.length ).toBe( 2 ) );

			expect( store.runParser ).toHaveBeenCalledTimes( 1 );
			expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: true } ] );
		} );

		it( 'fails validation on any other empty values', async () => {
			const wrapper = renderFunctionInputParser( {
				inputType: typeZid,
				value: ''
			} );

			// Wait for validation to complete
			await waitFor( () => expect( wrapper.emitted().validate.length ).toBe( 2 ) );

			expect( store.runParser ).toHaveBeenCalledTimes( 1 );
			expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: false, error: errorParser } ] );
		} );
	} );

	describe( 'default value functionality', () => {
		it( 'shows default value as placeholder when shouldUseDefaultValue is true', () => {
			const wrapper = renderFunctionInputParser( {
				inputType: typeZid,
				shouldUseDefaultValue: true,
				defaultValue: '02-03-2020'
			} );

			expect( wrapper.vm.placeholder ).toBe( '02-03-2020' );
		} );

		it( 'shows example placeholder when shouldUseDefaultValue is false and examples are available', () => {
			// Mock rendered examples
			store.getRendererExamples = jest.fn().mockReturnValue( [
				{ result: 'Example result' }
			] );
			const wrapper = renderFunctionInputParser( {
				inputType: typeZid,
				shouldUseDefaultValue: false
			} );

			expect( wrapper.vm.placeholder ).toContain( 'Example result' );
		} );
	} );

} );
