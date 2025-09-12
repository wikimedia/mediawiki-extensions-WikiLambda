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
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionInputParser, {
			props: {
				inputType: typeZid,
				value: 'Test value'
			}
		} );
		expect( wrapper.getComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
	} );

	it( 'emits input event when value changes', () => {
		const wrapper = shallowMount( FunctionInputParser, {
			props: {
				inputType: typeZid,
				value: 'Test value'
			}
		} );
		wrapper.getComponent( { name: 'cdx-text-input' } ).vm.$emit( 'update:model-value', 'New value' );
		expect( wrapper.emitted().input[ 0 ] ).toEqual( [ 'New value' ] );
	} );

	it( 'validates on mount with non-empty value', async () => {
		const wrapper = shallowMount( FunctionInputParser, {
			props: {
				inputType: typeZid,
				value: 'Non empty value'
			}
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
		const wrapper = shallowMount( FunctionInputParser, {
			props: {
				inputType: typeZid,
				value: ''
			}
		} );

		// Wait for initial validation to complete
		await waitFor( () => expect( wrapper.vm.isParserRunning ).toBe( false ) );
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

		const wrapper = shallowMount( FunctionInputParser, {
			props: {
				inputType: typeZid,
				value: 'Test value'
			}
		} );

		const handleChangeSpy = jest.spyOn( wrapper.vm, 'handleChange' );

		// Wait for initial validation of input value:
		await waitFor( () => expect( wrapper.vm.isParserRunning ).toBe( false ) );
		expect( wrapper.vm.debounceTimer ).toBeFalsy();

		// Update field, simulate multiple keystrokes
		const input = wrapper.getComponent( { name: 'cdx-text-input' } );
		input.vm.$emit( 'update:model-value', 'New va' );
		input.vm.$emit( 'update:model-value', 'New val' );
		input.vm.$emit( 'update:model-value', 'New valu' );
		input.vm.$emit( 'update:model-value', 'New value' );

		// Advance timer 100ms, nothing should have happened
		jest.advanceTimersByTime( 100 );
		expect( wrapper.vm.isParserRunning ).toBe( false );
		expect( handleChangeSpy ).not.toHaveBeenCalled();

		// Advance timer 1000ms, validation should have started
		jest.advanceTimersByTime( 1000 );
		expect( handleChangeSpy ).toHaveBeenCalledTimes( 1 );
		expect( handleChangeSpy ).toHaveBeenCalledWith( 'New value' );

		expect( wrapper.vm.isParserRunning ).toBe( true );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );

		await waitFor( () => expect( wrapper.vm.isParserRunning ).toBe( true ) );
		expect( store.runParser ).toHaveBeenCalledWith( {
			parserZid: 'Z30020',
			wait: true,
			zlang: 'Z1002',
			zobject: 'New value',
			signal: expect.any( Object )
		} );

		await waitFor( () => expect( wrapper.vm.isParserRunning ).toBe( false ) );
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: true } ] );
	} );

	it( 'emits validate event with error message on validation failure', async () => {
		store.runParser.mockRejectedValue( new Error( 'Invalid value' ) );

		const wrapper = shallowMount( FunctionInputParser, {
			props: {
				inputType: typeZid,
				value: 'Invalid value'
			}
		} );

		// Wait for initial validation to complete
		await waitFor( () => expect( wrapper.vm.isParserRunning ).toBe( false ) );

		wrapper.vm.validate( 'Invalid value' );

		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );
		expect( wrapper.vm.isParserRunning ).toBe( true );
		expect( store.runParser ).toHaveBeenCalledWith( {
			parserZid: 'Z30020',
			wait: true,
			zlang: 'Z1002',
			zobject: 'Invalid value',
			signal: expect.any( Object )
		} );
		await waitFor( () => expect( wrapper.vm.isParserRunning ).toBe( false ) );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );
	} );

	it( 'shows progress indicator while parser is running', async () => {
		const wrapper = shallowMount( FunctionInputParser, {
			props: {
				inputType: typeZid,
				value: 'Test value'
			}
		} );

		wrapper.vm.onValidateStart();
		await waitFor( () => expect( wrapper.vm.isParserRunning ).toBe( true ) );

		wrapper.vm.onValidateEnd();
		await waitFor( () => expect( wrapper.vm.isParserRunning ).toBe( false ) );
	} );

	describe( 'allowed empty types', () => {
		it( 'validates successfully an empty value for gregorian calendar date', async () => {
			const wrapper = shallowMount( FunctionInputParser, {
				props: {
					inputType: 'Z20420',
					value: ''
				}
			} );

			await waitFor( () => expect( wrapper.vm.isParserRunning ).toBe( false ) );
			expect( store.runParser ).toHaveBeenCalledTimes( 1 );
			expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: true } ] );
		} );

		it( 'fails validation on any other empty values', async () => {
			const wrapper = shallowMount( FunctionInputParser, {
				props: {
					inputType: typeZid,
					value: ''
				}
			} );

			await waitFor( () => expect( wrapper.vm.isParserRunning ).toBe( false ) );
			expect( store.runParser ).toHaveBeenCalledTimes( 1 );
			expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ {
				isValid: false,
				error: errorParser
			} ] );
		} );
	} );
} );
