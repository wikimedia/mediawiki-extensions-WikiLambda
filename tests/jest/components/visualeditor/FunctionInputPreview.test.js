'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const FunctionInputPreview = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/FunctionInputPreview.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const { createGettersWithFunctionsMock } = require( '../../helpers/getterHelpers.js' );

describe( 'FunctionInputPreview', () => {
	let store;

	/**
	 * Helper function to render FunctionInputPreview component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderFunctionInputPreview( props = {}, options = {} ) {
		const defaultOptions = {
			global: {
				stubs: { ...options?.stubs }
			}
		};
		return shallowMount( FunctionInputPreview, {
			props,
			...defaultOptions
		} );
	}

	const functionZid = 'Z30000';
	const rendererZid = 'Z30010';
	const parserZid = 'Z30020';
	let postMock, data;

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangCode = 'en';
		store.getUserLangZid = 'Z1002';
		// Mock parser and renderer ZIDs. Default: none
		store.getParserZid = createGettersWithFunctionsMock();
		store.getRendererZid = createGettersWithFunctionsMock();
		// Mock the output type of the function so its valid to run the preview
		store.getOutputTypeOfFunctionZid = createGettersWithFunctionsMock( 'Z6' );
		store.getFetchedObject = createGettersWithFunctionsMock( { success: true } );
		// Mock createObjectByType for all allowed types:
		store.createObjectByType = jest.fn().mockImplementation( ( { type, value } ) => {
			const blanks = {
				// String
				Z6: value || '',
				// Custom enum
				Z50000: value,
				// Builtin enum (boolean)
				Z40: { Z1K1: 'Z40', Z40K1: value },
				// Type with renderer function (gregorian calendar date)
				Z20420: { Z1K1: 'Z20420', Z20420K1: value },
				// Wikidata entities and references
				Z6091: { Z1K1: 'Z6091', Z6091K1: value },
				Z6001: {
					Z1K1: 'Z7',
					Z7K1: 'Z6821',
					Z6821K1: { Z1K1: 'Z6091', Z6091K1: value }
				},
				Z6095: { Z1K1: 'Z6095', Z6095K1: value },
				Z6005: {
					Z1K1: 'Z7',
					Z7K1: 'Z6825',
					Z6825K1: { Z1K1: 'Z6095', Z6095K1: value }
				}
			};
			return blanks[ type ];
		} );
		// Mock the function call response
		data = '{"Z1K1":"Z22","Z22K1":"some response"}';
		postMock = jest.fn( () => new Promise( ( resolve ) => {
			resolve( {
				wikilambda_function_call: { data }
			} );
		} ) );
		mw.Api = jest.fn( () => ( {
			post: postMock
		} ) );

	} );

	it( 'renders the component without errors', () => {
		// Test to ensure the component renders correctly
		const wrapper = renderFunctionInputPreview();
		expect( wrapper.find( '.ext-wikilambda-app-function-input-preview' ).exists() ).toBe( true );
	} );

	it( 'executes a function call with a string parameter and displays the result', async () => {
		// Test for a function call with a simple string parameter
		const wrapper = renderFunctionInputPreview( {
			payload: { functionZid, params: [ { value: 'a', type: 'Z6' } ] }
		}, {
			stubs: {
				'cdx-accordion': false
			}
		} );

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state and API call
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		expect( postMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			wikilambda_function_call_zobject: JSON.stringify( { Z1K1: 'Z7', Z7K1: functionZid, [ `${ functionZid }K1` ]: 'a' } ),
			uselang: 'en'
		}, { signal: expect.any( Object ) } );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.get( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
	} );

	it( 'executes a function call with an enum parameter and displays the result', async () => {
		const enumType = 'Z50000';
		const enumValue = 'Z50001';
		const wrapper = renderFunctionInputPreview( {
			payload: { functionZid, params: [ { value: enumValue, type: enumType } ] }
		}, {
			stubs: {
				'cdx-accordion': false
			}
		} );

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state and API call
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		expect( postMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			wikilambda_function_call_zobject: JSON.stringify( {
				Z1K1: 'Z7',
				Z7K1: functionZid,
				[ `${ functionZid }K1` ]: enumValue
			} ),
			uselang: 'en'
		}, { signal: expect.any( Object ) } );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.get( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
	} );

	it( 'executes a function call with an built-in enum parameter (boolean) and displays the result', async () => {
		const wrapper = renderFunctionInputPreview( {
			payload: { functionZid, params: [ { value: 'Z41', type: 'Z40' } ] }
		}, {
			stubs: {
				'cdx-accordion': false
			}
		} );

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state and API call
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		expect( postMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			wikilambda_function_call_zobject: JSON.stringify( {
				Z1K1: 'Z7',
				Z7K1: functionZid,
				[ `${ functionZid }K1` ]: {
					Z1K1: 'Z40',
					Z40K1: 'Z41'
				}
			} ),
			uselang: 'en'
		}, { signal: expect.any( Object ) } );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.get( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
	} );

	it( 'executes a function call with a parameter requiring a parser and displays the result', async () => {
		// Test for a function call with a parameter that requires a parser
		store.getParserZid = createGettersWithFunctionsMock( parserZid );
		const wrapper = renderFunctionInputPreview( {
			payload: { functionZid, params: [ { value: '4', type: 'Z40010' } ] }
		}, {
			stubs: {
				'cdx-accordion': false
			}
		} );

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state and API call
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		expect( postMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			wikilambda_function_call_zobject: JSON.stringify( {
				Z1K1: 'Z7',
				Z7K1: functionZid,
				[ `${ functionZid }K1` ]: {
					Z1K1: 'Z7',
					Z7K1: parserZid,
					[ `${ parserZid }K1` ]: '4',
					[ `${ parserZid }K2` ]: 'Z1002'
				}
			} ),
			uselang: 'en'
		}, { signal: expect.any( Object ) } );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.get( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
	} );

	it( 'executes a function call for a function with a renderer and displays the result', async () => {
		// Test for a function call with a renderer
		store.getRendererZid = createGettersWithFunctionsMock( rendererZid );
		const wrapper = renderFunctionInputPreview( {
			payload: { functionZid, params: [ { value: 'renderedValue', type: 'Z6' } ] }
		}, {
			stubs: {
				'cdx-accordion': false
			}
		} );

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state and API call
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		expect( postMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			wikilambda_function_call_zobject: JSON.stringify( {
				Z1K1: 'Z7',
				Z7K1: rendererZid,
				[ `${ rendererZid }K1` ]: {
					Z1K1: 'Z7',
					Z7K1: functionZid,
					[ `${ functionZid }K1` ]: 'renderedValue'
				},
				[ `${ rendererZid }K2` ]: 'Z1002'
			} ),
			uselang: 'en'
		}, { signal: expect.any( Object ) } );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.get( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
	} );

	it( 'executes a function call with an empty date and assigns default value', async () => {
		// Set fake timers
		jest.useFakeTimers();
		jest.setSystemTime( new Date( '2001-01-15T12:00:00Z' ) );

		store.getRendererZid = createGettersWithFunctionsMock( rendererZid );
		store.getParserZid = createGettersWithFunctionsMock( parserZid );
		const wrapper = renderFunctionInputPreview( {
			payload: { functionZid, params: [ { value: '', type: Constants.Z_GREGORIAN_CALENDAR_DATE } ] }
		}, {
			stubs: {
				'cdx-accordion': false
			}
		} );

		// The function call uses both renderer for the output and parser for the input,
		// so the expected function call is: renderer( function_call( parser( default_value ) ) )
		const expectedFunctionCall = {
			Z1K1: 'Z7',
			Z7K1: rendererZid,
			[ `${ rendererZid }K1` ]: {
				Z1K1: 'Z7',
				Z7K1: functionZid,
				[ `${ functionZid }K1` ]: {
					Z1K1: 'Z7',
					Z7K1: parserZid,
					[ `${ parserZid }K1` ]: '15-1-2001',
					[ `${ parserZid }K2` ]: 'Z1002'
				}
			},
			[ `${ rendererZid }K2` ]: 'Z1002'
		};

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state and API call
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		expect( postMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			wikilambda_function_call_zobject: JSON.stringify( expectedFunctionCall ),
			uselang: 'en'
		}, { signal: expect.any( Object ) } );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.get( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );

		// Reset real timers
		jest.useRealTimers();
	} );

	it( 'handles an unsuccessful function call and displays an error message', async () => {
		// Test for handling an unsuccessful function call
		data = '{"Z1K1":"Z22","Z22K1":"Z24"}';
		const wrapper = renderFunctionInputPreview( {
			payload: { functionZid, params: [] }
		}, {
			stubs: {
				'cdx-accordion': false
			}
		} );

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state and API call
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		expect( postMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			wikilambda_function_call_zobject: JSON.stringify( { Z1K1: 'Z7', Z7K1: functionZid } ),
			uselang: 'en'
		}, { signal: expect.any( Object ) } );

		// Wait for the error message and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		const message = wrapper.findComponent( { name: 'cdx-message' } );
		expect( message.exists() ).toBe( true );
		expect( message.props( 'type' ) ).toBe( 'error' );
	} );

	it( 'retries the function call when the retry button is clicked', async () => {
		// Test for retrying a function call
		const wrapper = renderFunctionInputPreview( {
			payload: { functionZid, params: [ { value: 'a', type: 'Z6' } ] }
		}, {
			stubs: {
				'cdx-accordion': false,
				'cdx-button': false,
				'cdx-icon': false
			}
		} );

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state and API call
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		expect( wrapper.get( '.cdx-accordion__action' ).text() ).toBe( 'Cancel' );
		expect( postMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			wikilambda_function_call_zobject: JSON.stringify( { Z1K1: 'Z7', Z7K1: functionZid, [ `${ functionZid }K1` ]: 'a' } ),
			uselang: 'en'
		}, { signal: expect.any( Object ) } );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.get( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );

		// Simulate opening the accordion again (somehow it gets closed (rerender?))
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Simulate clicking the retry button
		const actionButton = wrapper.find( '.cdx-accordion__action' );
		expect( actionButton.text() ).toBe( 'Reset' );
		await actionButton.trigger( 'click' );

		// Verify the function call is retried
		expect( postMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			wikilambda_function_call_zobject: JSON.stringify( { Z1K1: 'Z7', Z7K1: functionZid, [ `${ functionZid }K1` ]: 'a' } ),
			uselang: 'en'
		}, { signal: expect.any( Object ) } );
	} );

	it( 'cancels the function call and aborts the API call when the cancel button is clicked', async () => {
		const wrapper = renderFunctionInputPreview( {
			payload: { functionZid, params: [ { value: 'a', type: 'Z6' } ] }
		}, {
			stubs: {
				'cdx-accordion': false,
				'cdx-button': false
			}
		} );

		// Open the accordion to trigger the API call
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );

		// Check that loading indicator is shown
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );

		// Click the cancel button
		const actionButton = wrapper.find( '.cdx-accordion__action' );
		await actionButton.trigger( 'click' );

		expect( global.abortSpy ).toHaveBeenCalled();
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false );
		expect( wrapper.get( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
		expect( postMock ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'handles a failed function call and displays an error message', async () => {
		// Test for handling a failed API call
		postMock = jest.fn( () => Promise.reject( new Error( 'API call failed' ) ) );

		const wrapper = renderFunctionInputPreview( {
			payload: { functionZid: 'Z123', params: [ { value: 'a', type: 'Z6' } ] }
		}, {
			stubs: {
				'cdx-accordion': false,
				'cdx-message': false
			}
		} );

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );

		// Wait for the error message and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );

		const message = wrapper.findComponent( { name: 'cdx-message' } );
		expect( message.exists() ).toBe( true );
		expect( message.props( 'type' ) ).toBe( 'error' );
		expect( message.text() ).toBe( 'Unable to run function. Please try again.' );
	} );

	it( 'does not process a function call if the payload parameters remain unchanged', async () => {
		// Test to ensure no function call is made if the payload parameters remain unchanged
		const wrapper = renderFunctionInputPreview( {
			payload: { functionZid, params: [ { value: 'a', type: 'Z6' } ] }
		}, {
			stubs: {
				'cdx-accordion': false
			}
		} );

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state and API call
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );

		// Set the same props again and verify no additional function call is made
		await wrapper.setProps( { payload: { functionZid, params: [ { value: 'a', type: 'Z6' } ] } } );

		expect( postMock ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'executes a function call with multiple parameters including empty, null, and undefined values', async () => {
		// Test for a function call with multiple empty parameters
		const wrapper = renderFunctionInputPreview( {
			payload: {
				functionZid,
				params: [
					{ value: '', type: 'Z6' }, // Empty string
					{ value: null, type: 'Z6' }, // Null value
					{ value: undefined, type: 'Z6' } // Undefined value
				]
			}
		}, {
			stubs: {
				'cdx-accordion': false
			}
		} );

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state and API call
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		expect( postMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			wikilambda_function_call_zobject: JSON.stringify( {
				Z1K1: 'Z7',
				Z7K1: functionZid,
				[ `${ functionZid }K1` ]: '',
				[ `${ functionZid }K2` ]: '',
				[ `${ functionZid }K3` ]: ''
			} ),
			uselang: 'en'
		}, { signal: expect.any( Object ) } );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.get( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
	} );

	it( 'executes a function call with Z89/HTML fragment and displays the HTML fragment value', async () => {
		// Mock output type as Z89 (HTML fragment)
		store.getOutputTypeOfFunctionZid = createGettersWithFunctionsMock( 'Z89' );
		// Mock the function call response to return a Z89 object
		postMock = jest.fn( () => new Promise( ( resolve ) => {
			resolve( {
				wikilambda_function_call: {
					data: JSON.stringify( {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_RESPONSEENVELOPE,
						[ Constants.Z_RESPONSEENVELOPE_VALUE ]: {
							Z1K1: 'Z89',
							Z89K1: '<b>HTML Fragment</b>'
						}
					} )
				}
			} );
		} ) );
		mw.Api = jest.fn( () => ( {
			post: postMock
		} ) );

		const wrapper = renderFunctionInputPreview( {
			payload: { functionZid, params: [ { value: 'a', type: 'Z6' } ] }
		}, {
			stubs: {
				'cdx-accordion': false
			}
		} );

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state and API call
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		expect( postMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			wikilambda_function_call_zobject: JSON.stringify( { Z1K1: 'Z7', Z7K1: functionZid, [ `${ functionZid }K1` ]: 'a' } ),
			uselang: 'en'
		}, { signal: expect.any( Object ) } );

		// Wait for the result and verify it is displayed as the HTML fragment value
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.get( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( '<b>HTML Fragment</b>' );
	} );

	it( 'executes a function call with a wikidata items and item references', async () => {
		const wrapper = renderFunctionInputPreview( {
			payload: { functionZid, params: [
				// Wikidata item
				{ value: 'Q144', type: 'Z6001' },
				// Wikidata item reference
				{ value: 'Q144', type: 'Z6091' }
			] }
		}, {
			stubs: {
				'cdx-accordion': false
			}
		} );

		const expectedEntityReference = { Z1K1: 'Z6091', Z6091K1: 'Q144' };
		const expectedEntity = {
			Z1K1: 'Z7',
			Z7K1: 'Z6821',
			Z6821K1: expectedEntityReference
		};
		const expectedFunctionCall = {
			Z1K1: 'Z7',
			Z7K1: functionZid,
			[ `${ functionZid }K1` ]: expectedEntity,
			[ `${ functionZid }K2` ]: expectedEntityReference
		};

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state and API call
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		expect( postMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			wikilambda_function_call_zobject: JSON.stringify( expectedFunctionCall ),
			uselang: 'en'
		}, { signal: {} } );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.get( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
	} );

	it( 'executes a function call with a wikidata lexemes and lexeme references', async () => {
		const wrapper = renderFunctionInputPreview( {
			payload: { functionZid, params: [
				// Wikidata lexeme
				{ value: 'L333333', type: 'Z6005' },
				// Wikidata lexeme reference
				{ value: 'L333333', type: 'Z6095' }
			] }
		}, {
			stubs: {
				'cdx-accordion': false
			}
		} );

		const expectedEntityReference = { Z1K1: 'Z6095', Z6095K1: 'L333333' };
		const expectedEntity = {
			Z1K1: 'Z7',
			Z7K1: 'Z6825',
			Z6825K1: expectedEntityReference
		};
		const expectedFunctionCall = {
			Z1K1: 'Z7',
			Z7K1: functionZid,
			[ `${ functionZid }K1` ]: expectedEntity,
			[ `${ functionZid }K2` ]: expectedEntityReference
		};

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state and API call
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		expect( postMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			wikilambda_function_call_zobject: JSON.stringify( expectedFunctionCall ),
			uselang: 'en'
		}, { signal: {} } );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.get( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
	} );
} );
