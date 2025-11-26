/*!
 * WikiLambda unit test suite for the FunctionExplorer component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const FunctionExplorer = require( '../../../../../resources/ext.wikilambda.app/components/widgets/function-explorer/FunctionExplorer.vue' );

const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../../helpers/getterHelpers.js' );

const reverseStringFunctionZid = 'Z10004';
const reverseStringFunction = {
	Z1K1: 'Z2',
	Z2K2: {
		Z1K1: 'Z8',
		Z8K2: 'Z6'
	}
};
const reverseStringFunctionArguments = [
	{ Z17K1: 'Z6', Z17K2: 'Z10004K1' }
];

const isReverseStringFunctionZid = 'Z10002';
const isReverseStringFunction = {
	Z1K1: 'Z2',
	Z2K2: {
		Z1K1: 'Z8',
		Z8K2: 'Z40'
	}
};
const isReverseStringFunctionArguments = [
	{ Z17K1: 'Z6', Z17K2: 'Z10002K1' },
	{ Z17K1: 'Z6', Z17K2: 'Z10002K2' }
];

describe( 'FunctionExplorer', () => {
	let store;

	function renderFunctionExplorer( props = {}, options = {} ) {
		const defaultOptions = {
			global: {
				stubs: {
					WlWidgetBase: false,
					CdxButton: false,
					WlZObjectToString: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( FunctionExplorer, {
			props,
			...defaultOptions
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.fetchZids = jest.fn().mockResolvedValue();
		store.getLabelData = createLabelDataMock( {
			Z6: 'String',
			Z40: 'Boolean',
			Z881: 'Typed list',
			Z10002: 'Is reverse string',
			Z10002K1: 'String one',
			Z10002K2: 'String two',
			Z10004: 'Reverse string',
			Z10004K1: 'String to reverse'
		} );
		store.getUserLangCode = 'en';
		store.getStoredObject = ( zid ) => {
			if ( !zid || zid === '' ) {
				return null;
			}
			return zid === reverseStringFunctionZid ?
				reverseStringFunction :
				isReverseStringFunction;
		};
		store.getInputsOfFunctionZid = ( zid ) => {
			if ( !zid || zid === '' ) {
				return [];
			}
			return zid === reverseStringFunctionZid ?
				reverseStringFunctionArguments :
				isReverseStringFunctionArguments;
		};
		window.open = jest.fn();
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionExplorer();

		expect( wrapper.find( '.ext-wikilambda-app-function-explorer-widget' ).exists() ).toBe( true );
	} );

	describe( 'Edit mode', () => {
		it( 'should display a view function button', () => {
			const wrapper = renderFunctionExplorer( {
				functionZid: reverseStringFunctionZid,
				edit: true
			} );

			const buttonViewFunction = wrapper.find( '[data-testid="button-view-function"]' );

			expect( buttonViewFunction.exists() ).toBe( true );
		} );

		it( 'should redirect to the function page when the view function button is clicked', () => {
			const wrapper = renderFunctionExplorer( {
				functionZid: reverseStringFunctionZid,
				edit: true
			} );

			const buttonViewFunction = wrapper.find( '[data-testid="button-view-function"]' );

			const spy = jest.spyOn( window, 'open' );

			buttonViewFunction.trigger( 'click' );

			expect( window.open ).toHaveBeenCalledTimes( 1 );

			spy.mockRestore();
		} );

		describe( 'when a function is selected from the lookup component', () => {
			let wrapper, propsData;

			beforeEach( () => {
				propsData = {
					functionZid: reverseStringFunctionZid,
					edit: true
				};
				wrapper = renderFunctionExplorer( propsData );
			} );

			it( 'should update the function selection', async () => {
				// Initial function should have 1 input (reverse string function)
				expect( wrapper.getComponent( { name: 'wl-z-object-selector' } ).props( 'selectedZid' ) ).toBe( reverseStringFunctionZid );
				expect( wrapper.findAll( '[data-testid="function-input-name"]' ) ).toHaveLength( 1 );
				expect( wrapper.findAll( '[data-testid="function-input-name"]' )[ 0 ].text() ).toBe( 'String to reverse' );

				// Change the selected function
				await wrapper.getComponent( { name: 'wl-z-object-selector' } ).vm.$emit( 'select-item', isReverseStringFunctionZid );

				// Function details should update to show the new function (is reverse string function with 2 inputs)
				await waitFor( () => {
					expect( wrapper.getComponent( { name: 'wl-z-object-selector' } ).props( 'selectedZid' ) ).toBe( isReverseStringFunctionZid );
				} );
				const inputNames = wrapper.findAll( '[data-testid="function-input-name"]' );
				expect( inputNames ).toHaveLength( 2 );
				expect( inputNames[ 0 ].text() ).toBe( 'String one' );
				expect( inputNames[ 1 ].text() ).toBe( 'String two' );

				expect( wrapper.get( '[data-testid="function-output"]' ).text() ).toBe( 'Boolean' );
			} );
		} );

		describe( 'Implementation: Code', () => {
			let wrapper;

			beforeEach( () => {
				wrapper = renderFunctionExplorer( {
					functionZid: reverseStringFunctionZid,
					edit: true,
					implementation: Constants.Z_IMPLEMENTATION_CODE
				} );
			} );

			describe( 'when a valid functionZid is provided', () => {
				beforeAll( () => {
					navigator.clipboard = {
						writeText: jest.fn().mockResolvedValue()
					};

					jest.spyOn( navigator.clipboard, 'writeText' );

				} );

				afterAll( () => {
					navigator.clipboard.writeText.mockRestore();
				} );

				it( 'should display the zid of the current function', () => {
					const functionZid = wrapper.find( '[data-testid="function-zid"]' );

					expect( functionZid.text() ).toBe( reverseStringFunctionZid );
				} );
				it( 'should display the zkey of each input', () => {
					const functionZKeysWrapper = wrapper.findAll( '[data-testid="function-input-zkey"]' );
					const functionZKeys = functionZKeysWrapper.map( ( functionZKey ) => functionZKey.text() );

					expect( functionZKeys ).toEqual( [ 'Z10004K1' ] );
				} );
				it( 'should copy the zkey of each input when the zkey is clicked', () => {
					const functionZKeyWrapper = wrapper.find( '[data-testid="function-input-zkey"]' );
					const functionZKey = functionZKeyWrapper.text();

					functionZKeyWrapper.trigger( 'click' );

					expect( navigator.clipboard.writeText ).toHaveBeenCalledWith( functionZKey );
				} );
			} );

		} );

		describe( 'Reset FunctionExplorer', () => {
			let wrapper, resetButton;

			describe( 'with an input functionZid', () => {
				beforeEach( () => {
					wrapper = renderFunctionExplorer( {
						functionZid: reverseStringFunctionZid,
						edit: true
					} );
					resetButton = wrapper.find( '[data-testid="function-explorer-reset-button"]' );
				} );

				it( 'should have a reset button', () => {
					expect( resetButton.exists() ).toBe( true );
				} );

				it( 'should reset the inputs of the function to the originally selected function', async () => {
					// Change the selected function before clicking the reset button
					await wrapper.getComponent( { name: 'wl-z-object-selector' } ).vm.$emit( 'select-item', isReverseStringFunctionZid );
					expect( wrapper.findAll( '[data-testid="function-input-type"]' ).length ).toBe( 2 );

					resetButton.trigger( 'click' );

					await waitFor( () => expect( wrapper.findAll( '[data-testid="function-input-type"]' ).length ).toBe( 1 ) );
					expect( wrapper.findAll( '[data-testid="function-input-type"]' )[ 0 ].text() ).toBe( 'String' );
				} );

				it( 'should reset the output of the function to the originally selected function', async () => {
					// Change the selected function before clicking the reset button
					await wrapper.getComponent( { name: 'wl-z-object-selector' } ).vm.$emit( 'select-item', isReverseStringFunctionZid );
					expect( wrapper.get( '[data-testid="function-output"]' ).text() ).toBe( 'Boolean' );

					resetButton.trigger( 'click' );

					await waitFor( () => expect( wrapper.get( '[data-testid="function-output"]' ).text() ).toBe( 'String' ) );
				} );
			} );

			describe( 'with no input functionZid', () => {
				beforeEach( () => {
					wrapper = renderFunctionExplorer( {
						edit: true
					} );
					resetButton = wrapper.find( '[data-testid="function-explorer-reset-button"]' );
				} );

				it( 'should have a reset button', () => {
					expect( resetButton.exists() ).toBe( true );
				} );

				it( 'should clear the selection when clicking reset button', async () => {
					// Initializes with no selected function zid - no function details should be shown
					expect( wrapper.findAll( '[data-testid="function-input-name"]' ) ).toHaveLength( 0 );

					// Selects a function zid - function details should appear
					await wrapper.getComponent( { name: 'wl-z-object-selector' } ).vm.$emit( 'select-item', isReverseStringFunctionZid );
					await waitFor( () => {
						expect( wrapper.findAll( '[data-testid="function-input-name"]' ) ).toHaveLength( 2 );
					} );

					// On reset, goes back to no selected function zid - function details should disappear
					resetButton.trigger( 'click' );
					await waitFor( () => {
						expect( wrapper.findAll( '[data-testid="function-input-name"]' ) ).toHaveLength( 0 );
					} );
				} );
			} );
		} );
	} );

	it( 'fetches zids for argument and output types', () => {
		renderFunctionExplorer( {
			functionZid: reverseStringFunctionZid,
			edit: false
		} );

		// Should fetch ZIDs referenced by inputs/outputs (argument type Z6 and return type Z6)
		expect( store.fetchZids ).toHaveBeenCalledWith( { zids: expect.arrayContaining( [ 'Z6' ] ) } );
	} );

	it( 'fetches function call zids for generic argument types', () => {
		const typedPairType = {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
			[ Constants.Z_FUNCTION_CALL_FUNCTION ]: 'Z882'
		};
		// Create a function object that includes Z8K1 (arguments) with the typedPairType
		const functionWithTypedPairArg = {
			Z1K1: 'Z2',
			Z2K2: {
				Z1K1: 'Z8',
				Z8K1: [
					'Z17',
					{
						Z1K1: 'Z17',
						Z17K1: typedPairType,
						Z17K2: 'Z10004K1'
					}
				],

				Z8K2: 'Z6'
			}
		};
		store.getStoredObject = ( zid ) => {
			if ( !zid || zid === '' ) {
				return null;
			}
			return zid === reverseStringFunctionZid ?
				functionWithTypedPairArg :
				isReverseStringFunction;
		};
		store.getInputsOfFunctionZid = createGettersWithFunctionsMock( [
			{
				[ Constants.Z_ARGUMENT_KEY ]: 'Z10004K1',
				[ Constants.Z_ARGUMENT_TYPE ]: typedPairType
			}
		] );

		renderFunctionExplorer( {
			functionZid: reverseStringFunctionZid,
			edit: false
		} );

		// Should fetch ZIDs referenced by the argument/return types (Z882 via function call type, Z7 call, Z6 return).
		expect( store.fetchZids ).toHaveBeenCalledWith( {
			zids: expect.arrayContaining( [ 'Z882', 'Z7', 'Z6' ] )
		} );
	} );

	describe( 'Read mode', () => {
		it( 'should NOT display the lookup used to select a function', () => {
			const wrapper = renderFunctionExplorer( {
				functionZid: reverseStringFunctionZid,
				edit: false
			} );

			expect( wrapper.find( '[data-testid="function-selector"]' ).exists() ).toBe( false );
		} );

		describe( 'when a valid functionZid is provided', () => {
			let wrapper;
			beforeEach( () => {
				wrapper = renderFunctionExplorer( {
					functionZid: reverseStringFunctionZid,
					edit: false
				} );
			} );

			it( 'displays the name of the function', () => {
				const functionName = wrapper.get( '[data-testid="function-name"]' ).text();
				expect( functionName ).toBe( 'Reverse string' );
			} );

			it( 'it displays the names of the function arguments', () => {
				const inputsWrapper = wrapper.findAll( '[data-testid="function-input-name"]' );

				expect( inputsWrapper.length ).toBe( 1 );
				expect( inputsWrapper[ 0 ].text() ).toBe( 'String to reverse' );
			} );

			it( 'it displays the types of the function arguments', () => {
				const inputsWrapper = wrapper.findAll( '[data-testid="function-input-type"]' );

				expect( inputsWrapper.length ).toBe( 1 );
				expect( inputsWrapper[ 0 ].text() ).toBe( 'String' );
			} );

			it( 'the link to the input type should redirect to the page that represents the type of the input', () => {
				const inputWrapper = wrapper.find( '[data-testid="function-input-type"]' );
				const link = inputWrapper.find( 'a' );

				expect( link.attributes() ).toHaveProperty( 'href' );
				expect( link.attributes().href ).toContain( 'Z6' );
			} );

			it( 'it displays the output of the function', () => {
				const outputWrapper = wrapper.find( '[data-testid="function-output"]' );

				expect( outputWrapper.text() ).toBe( 'String' );
			} );
			it( 'the link to the output type should redirect to the page that represents the type of the input', () => {
				const outputWrapper = wrapper.find( '[data-testid="function-output"]' );
				const link = outputWrapper.find( 'a' );

				expect( link.attributes() ).toHaveProperty( 'href' );
				expect( link.attributes().href ).toContain( 'Z6' );
			} );
		} );
	} );

	describe( 'Zero-blank state', () => {
		describe( 'when no valid function was found', () => {
			it( 'should display a zero-blank state', () => {
				store.getStoredObject = createGettersWithFunctionsMock();
				store.getInputsOfFunctionZid = createGettersWithFunctionsMock( [] );

				const wrapper = renderFunctionExplorer( {
					edit: true
				} );

				const inputsWrapper = wrapper.findAll( '[data-testid="function-input-type"]' );
				expect( inputsWrapper.length ).toBe( 0 );

				const outputWrapper = wrapper.find( '[data-testid="function-output"]' );
				expect( outputWrapper.exists() ).toBe( false );
			} );
		} );
	} );
} );
