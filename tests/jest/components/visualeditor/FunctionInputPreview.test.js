'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const FunctionInputPreview = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/FunctionInputPreview.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const { createGettersWithFunctionsMock } = require( '../../helpers/getterHelpers.js' );

describe( 'FunctionInputPreview', () => {
	let store;

	const functionZid = 'Z30000';
	const rendererZid = 'Z30010';
	const parserZid = 'Z30020';
	let postMock, data;

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangCode = 'en';
		store.getUserLangZid = 'Z1002';
		// Mock enum type and custom enum: Default: false
		store.isEnumType = createGettersWithFunctionsMock( false );
		store.isCustomEnum = createGettersWithFunctionsMock( false );
		// Mock parser and renderer ZIDs. Default: none
		store.getParserZid = createGettersWithFunctionsMock();
		store.getRendererZid = createGettersWithFunctionsMock();
		// Mock the output type of the function so its valid to run the preview
		store.getOutputTypeOfFunctionZid = createGettersWithFunctionsMock( 'Z6' );
		store.getFetchedObject = createGettersWithFunctionsMock( { success: true } );
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
		const wrapper = shallowMount( FunctionInputPreview );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-preview' ).exists() ).toBe( true );
	} );

	it( 'executes a function call with a string parameter and displays the result', async () => {
		// Test for a function call with a simple string parameter
		const wrapper = shallowMount( FunctionInputPreview, {
			props: {
				payload: { functionZid, params: [ { value: 'a', type: 'Z6' } ] }
			},
			global: {
				stubs: {
					'cdx-accordion': false
				}
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
		} );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
	} );

	it( 'executes a function call with an enum parameter and displays the result', async () => {
		// Test for a function call with an enum parameter
		store.isEnumType = createGettersWithFunctionsMock( true );
		store.isCustomEnum = createGettersWithFunctionsMock( false );
		const wrapper = shallowMount( FunctionInputPreview, {
			props: {
				payload: { functionZid, params: [ { value: 'Z50001', type: 'Z50000' } ] }
			},
			global: {
				stubs: {
					'cdx-accordion': false
				}
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
					Z1K1: 'Z50000',
					Z50000K1: 'Z50001' }
			} ),
			uselang: 'en'
		} );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
	} );

	it( 'executes a function call with an built-in enum parameter and displays the result', async () => {
		// Test for a function call with a built-in enum parameter
		store.isEnumType = createGettersWithFunctionsMock( true );
		store.isCustomEnum = createGettersWithFunctionsMock( true );
		const wrapper = shallowMount( FunctionInputPreview, {
			props: {
				payload: { functionZid, params: [ { value: 'Z41', type: 'Z40' } ] }
			},
			global: {
				stubs: {
					'cdx-accordion': false
				}
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
			wikilambda_function_call_zobject: JSON.stringify( { Z1K1: 'Z7', Z7K1: functionZid, [ `${ functionZid }K1` ]: 'Z41' } ),
			uselang: 'en'
		} );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
	} );

	it( 'executes a function call with a parameter requiring a parser and displays the result', async () => {
		// Test for a function call with a parameter that requires a parser
		store.getParserZid = createGettersWithFunctionsMock( parserZid );
		const wrapper = shallowMount( FunctionInputPreview, {
			props: {
				payload: { functionZid, params: [ { value: '4', type: 'Z40010' } ] }
			},
			global: {
				stubs: {
					'cdx-accordion': false
				}
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
		} );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
	} );

	it( 'executes a function call for a function with a renderer and displays the result', async () => {
		// Test for a function call with a renderer
		store.getRendererZid = createGettersWithFunctionsMock( rendererZid );
		const wrapper = shallowMount( FunctionInputPreview, {
			props: {
				payload: { functionZid, params: [ { value: 'renderedValue', type: 'Z6' } ] }
			},
			global: {
				stubs: {
					'cdx-accordion': false
				}
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
		} );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
	} );

	it( 'executes a function call with an empty date and assigns default value', async () => {
		// Set fake timers
		jest.useFakeTimers();
		jest.setSystemTime( new Date( '2001-01-15T12:00:00Z' ) );

		store.getRendererZid = createGettersWithFunctionsMock( rendererZid );
		const wrapper = shallowMount( FunctionInputPreview, {
			props: {
				payload: { functionZid, params: [ { value: '', type: Constants.Z_GREGORIAN_CALENDAR_DATE } ] }
			},
			global: {
				stubs: {
					'cdx-accordion': false
				}
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
					[ `${ functionZid }K1` ]: '15-1-2001'
				},
				[ `${ rendererZid }K2` ]: 'Z1002'
			} ),
			uselang: 'en'
		} );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );

		// Reset real timers
		jest.useRealTimers();
	} );

	it( 'handles an unsuccessful function call and displays an error message', async () => {
		// Test for handling an unsuccessful function call
		data = '{"Z1K1":"Z22","Z22K1":"Z24"}';
		const wrapper = shallowMount( FunctionInputPreview, {
			props: {
				payload: { functionZid, params: [] }
			},
			global: {
				stubs: {
					'cdx-accordion': false
				}
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
		} );

		// Wait for the error message and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		const message = wrapper.findComponent( { name: 'cdx-message' } );
		expect( message.exists() ).toBe( true );
		expect( message.props( 'type' ) ).toBe( 'error' );
	} );

	it( 'retries the function call when the retry button is clicked', async () => {
		// Test for retrying a function call
		const wrapper = shallowMount( FunctionInputPreview, {
			props: {
				payload: { functionZid, params: [ { value: 'a', type: 'Z6' } ] }
			},
			global: {
				stubs: {
					'cdx-accordion': false,
					'cdx-button': false,
					'cdx-icon': false
				}
			}
		} );

		// Simulate opening the accordion
		const accordion = wrapper.findComponent( { name: 'cdx-accordion' } );
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Verify loading state and API call
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );
		expect( wrapper.find( '.cdx-accordion__action' ).text() ).toBe( 'Cancel' );
		expect( postMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			wikilambda_function_call_zobject: JSON.stringify( { Z1K1: 'Z7', Z7K1: functionZid, [ `${ functionZid }K1` ]: 'a' } ),
			uselang: 'en'
		} );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );

		// Simulate opening the accordion again (somehow it gets closed (rerender?))
		await accordion.vm.$emit( 'update:modelValue', true );
		expect( accordion.attributes( 'open' ) ).toBeDefined();

		// Simulate clicking the retry button
		const actionButton = wrapper.find( '.cdx-accordion__action' );
		expect( actionButton.text() ).toBe( 'Reset' );
		await actionButton.trigger( 'click' );

		// Verify the function call is retried
		expect( postMock ).toHaveBeenCalledTimes( 2 );
	} );

	it( 'cancels the function call when the cancel button is clicked', async () => {
		// Test for cancelling a function call
		const wrapper = shallowMount( FunctionInputPreview, {
			props: {
				payload: { functionZid, params: [ { value: 'a', type: 'Z6' } ] }
			},
			global: {
				stubs: {
					'cdx-accordion': false,
					'cdx-button': false
				}
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
		} );

		// Simulate clicking the cancel button
		const actionButton = wrapper.find( '.cdx-accordion__action' );
		await actionButton.trigger( 'click' );

		// Verify the function call is cancelled
		expect( wrapper.vm.isCancelled ).toBe( true );
		expect( postMock ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'handles a failed function call and displays an error message', async () => {
		// Test for handling a failed API call
		postMock = jest.fn( () => Promise.reject( new Error( 'API call failed' ) ) );

		const wrapper = shallowMount( FunctionInputPreview, {
			props: {
				payload: { functionZid: 'Z123', params: [ { value: 'a', type: 'Z6' } ] }
			},
			global: {
				stubs: {
					'cdx-accordion': false,
					'cdx-message': false
				}
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
		const wrapper = shallowMount( FunctionInputPreview, {
			props: {
				payload: { functionZid, params: [ { value: 'a', type: 'Z6' } ] }
			},
			global: {
				stubs: {
					'cdx-accordion': false
				}
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
		const wrapper = shallowMount( FunctionInputPreview, {
			props: {
				payload: {
					functionZid,
					params: [
						{ value: '', type: 'Z6' }, // Empty string
						{ value: null, type: 'Z6' }, // Null value
						{ value: undefined, type: 'Z6' } // Undefined value
					]
				}
			},
			global: {
				stubs: {
					'cdx-accordion': false
				}
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
		} );

		// Wait for the result and verify it is displayed
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( 'some response' );
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

		const wrapper = shallowMount( FunctionInputPreview, {
			props: {
				payload: { functionZid, params: [ { value: 'a', type: 'Z6' } ] }
			},
			global: {
				stubs: {
					'cdx-accordion': false
				}
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
		} );

		// Wait for the result and verify it is displayed as the HTML fragment value
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-preview__content' ).text() ).toBe( '<b>HTML Fragment</b>' );
	} );
} );
