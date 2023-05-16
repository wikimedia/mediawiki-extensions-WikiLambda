/*!
 * WikiLambda unit test suite for the FunctionExplorer component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	FunctionExplorer = require( '../../../../resources/ext.wikilambda.edit/components/widgets/FunctionExplorer.vue' ),
	mount = require( '@vue/test-utils' ).mount,
	icons = require( '../../fixtures/icons.json' );

const reverseStringFunctionArguments = [
	{
		type: 'String',
		label: 'String to reverse',
		typeZid: Constants.Z_STRING,
		keyZid: 'Z10004K1'
	}
];

const capitalizeStringFunctionArguments = [
	{
		type: 'String',
		label: 'String to check',
		typeZid: Constants.Z_STRING,
		keyZid: 'Z10002K1'
	}
];

const REVERSE_STRING_FUNCTION_ZID = 'Z10004';
const CAPITALIZE_STRING_FUNCTION_ZID = 'Z10002';

let currentFunctionZid = REVERSE_STRING_FUNCTION_ZID;

const mockFunctionExplorerComputed = {
	getPersistedObject: () => mockReverseStringFunction,
	functionName: jest.fn( () => currentFunctionZid === REVERSE_STRING_FUNCTION_ZID ? 'Reverse string' : 'String is truthy' ),
	functionArguments: jest.fn( () =>
		currentFunctionZid === REVERSE_STRING_FUNCTION_ZID ?
			reverseStringFunctionArguments :
			capitalizeStringFunctionArguments
	),
	functionExists: jest.fn( () => true ),
	outputTypeZid: jest.fn( () =>
		currentFunctionZid === REVERSE_STRING_FUNCTION_ZID ?
			Constants.Z_STRING :
			Constants.Z_BOOLEAN
	),
	outputType: jest.fn( () => currentFunctionZid === REVERSE_STRING_FUNCTION_ZID ? 'String' : 'Boolean' )
};

function createFunctionExplorerWrapper( propsData = {}, computed = $.extend( mockFunctionExplorerComputed, {} ) ) {
	return mount( FunctionExplorer, {
		propsData: propsData,
		computed: computed
	} );
}

describe( 'FunctionExplorer', function () {
	beforeAll( function () {
		getters = {
			getErrors: jest.fn( () => false ),
			getLabel: jest.fn( () => () => 'Some Label' )
		};

		global.store.hotUpdate( { getters: getters } );
	} );

	it( 'renders without errors', function () {
		const wrapper = createFunctionExplorerWrapper();

		expect( wrapper.find( '.ext-wikilambda-function-explorer' ).exists() ).toBe( true );
	} );

	describe( 'Edit mode', function () {
		it( 'should display a view function button', function () {

			const wrapper = createFunctionExplorerWrapper( {
				functionZid: REVERSE_STRING_FUNCTION_ZID,
				edit: true
			} );

			const buttonViewFunction = wrapper.find( '[data-testid="button-view-function"]' );

			expect( buttonViewFunction.exists() ).toBe( true );
		} );

		it( 'should redirect to the function page when the view function button is clicked', function () {
			const wrapper = createFunctionExplorerWrapper( {
				functionZid: REVERSE_STRING_FUNCTION_ZID,
				edit: true
			} );

			const buttonViewFunction = wrapper.find( '[data-testid="button-view-function"]' );

			const spy = jest.spyOn( window, 'open' );

			buttonViewFunction.trigger( 'click' );

			expect( window.open ).toHaveBeenCalledTimes( 1 );

			spy.mockRestore();
		} );

		describe( 'when a function is selected from the lookup component', function () {
			let wrapper, propsData;

			beforeEach( function () {
				propsData = {
					functionZid: REVERSE_STRING_FUNCTION_ZID,
					edit: true
				};
				wrapper = createFunctionExplorerWrapper( propsData );
			} );

			afterEach( function () {
				// Revert the function zid to the original one so it does not affect other tests
				currentFunctionZid = REVERSE_STRING_FUNCTION_ZID;
			} );

			it( 'should update the function name', function () {
				expect( wrapper.vm.functionName ).toBe( 'Reverse string' );
				currentFunctionZid = CAPITALIZE_STRING_FUNCTION_ZID;

				// We need to remount the wrapper to trigger the computed properties
				wrapper = createFunctionExplorerWrapper( propsData );

				expect( wrapper.vm.functionName ).toBe( 'String is truthy' );
			} );

			it( 'should update the function inputs', function () {
				expect( wrapper.vm.functionArguments ).toEqual( reverseStringFunctionArguments );
				currentFunctionZid = CAPITALIZE_STRING_FUNCTION_ZID;

				// We need to remount the wrapper to trigger the computed properties
				wrapper = createFunctionExplorerWrapper( propsData );
				expect( wrapper.vm.functionArguments ).toEqual( capitalizeStringFunctionArguments );
			} );

			it( 'should update the function output', function () {
				expect( wrapper.vm.outputTypeZid ).toBe( Constants.Z_STRING );
				currentFunctionZid = CAPITALIZE_STRING_FUNCTION_ZID;

				// We need to remount the wrapper to trigger the computed properties
				wrapper = createFunctionExplorerWrapper( propsData );
				expect( wrapper.vm.outputTypeZid ).toBe( Constants.Z_BOOLEAN );
			} );
		} );

		describe( 'Implementation: Code', function () {
			let wrapper;

			beforeEach( function () {
				wrapper = createFunctionExplorerWrapper( {
					functionZid: REVERSE_STRING_FUNCTION_ZID,
					edit: true,
					implementation: Constants.Z_IMPLEMENTATION_CODE
				} );
			} );

			describe( 'when a valid functionZid is provided', function () {
				beforeAll( function () {
					Object.defineProperty( navigator, 'clipboard', {
						value: {
							writeText: jest.fn()
						}
					} );

					jest.spyOn( navigator.clipboard, 'writeText' );

				} );

				afterAll( function () {
					navigator.clipboard.writeText.mockRestore();
				} );

				it( 'should display the zid of the current function', function () {
					const functionZid = wrapper.find( '[data-testid="function-zid"]' );

					expect( functionZid.text() ).toBe( REVERSE_STRING_FUNCTION_ZID );
				} );
				it( 'should display the zkey of each input', function () {
					const functionZKeysWrapper = wrapper.findAll( '[data-testid="function-input-zkey"]' );
					const functionZKeys = functionZKeysWrapper.map( ( functionZKey ) => functionZKey.text() );

					expect( functionZKeys ).toEqual( [ 'Z10004K1' ] );
				} );
				it( 'should copy the zkey of each input when the zkey is clicked', function () {
					const functionZKeyWrapper = wrapper.find( '[data-testid="function-input-zkey"]' );
					const functionZKey = functionZKeyWrapper.text();

					functionZKeyWrapper.trigger( 'click' );

					expect( navigator.clipboard.writeText ).toHaveBeenCalledWith( functionZKey );
				} );
			} );

		} );

		describe( 'Reset FunctionExplorer', function () {

			let wrapper, resetButton;

			beforeEach( function () {
				wrapper = createFunctionExplorerWrapper(
					{
						functionZid: REVERSE_STRING_FUNCTION_ZID,
						edit: true
					},
					$.extend( mockFunctionExplorerComputed, {
						resetIcon: () => icons.cdxIconHistory

					} )
				);

				resetButton = wrapper.find( '[data-testid="function-explorer-reset-button"]' );
			} );

			it( 'should have a reset button', function () {
				expect( resetButton.exists() ).toBe( true );
			} );

			describe( 'when a functionZid was specified in the FunctionExplorer and the reset button is clicked', function () {
				it( 'should reset the inputs of the function to the originally selected function', function () {
					// TODO: Change the selected function before clicking the reset button
					// const functionSelector = wrapper.findComponent( ZObjectSelector );

					resetButton.trigger( 'click' );

					const inputsWrapper = wrapper.findAll( '[data-testid="function-input-type"]' );

					expect( inputsWrapper.length ).toBe( 1 );
					expect( inputsWrapper[ 0 ].text() ).toBe( 'String' );
				} );

				it( 'should reset the output of the function to the originally selected function', function () {
					// TODO: Change the selected function before clicking the reset button
					// const functionSelector = wrapper.findComponent( ZObjectSelector );

					resetButton.trigger( 'click' );

					const outputWrapper = wrapper.find( '[data-testid="function-output"]' );

					expect( outputWrapper.text() ).toBe( 'String' );
				} );

			} );

			describe( 'when a functionZid was NOT provided in the FunctionExplorer and the reset button is clicked', function () {
				it( 'should do nothing', function () {

				} );
			} );
		} );
	} );

	describe( 'Read mode', function () {

		it( 'should NOT display the lookup used to select a function', function () {
			const wrapper = createFunctionExplorerWrapper(
				{
					functionZid: REVERSE_STRING_FUNCTION_ZID,
					edit: false
				},
				$.extend( mockFunctionExplorerComputed, {} )
			);

			expect( wrapper.find( '[data-testid="function-selector"]' ).exists() ).toBe( false );
		} );

		describe( 'when a valid functionZid is provided', function () {
			let wrapper;
			beforeEach( function () {
				wrapper = createFunctionExplorerWrapper(
					{
						functionZid: REVERSE_STRING_FUNCTION_ZID,
						edit: false
					},
					$.extend( mockFunctionExplorerComputed, {} )
				);
			} );

			it( 'displays the name of the function', function () {
				const functionName = wrapper.find( '[data-testid="function-name"]' ).text();
				expect( functionName ).toBe( 'Reverse string' );
			} );

			it( 'it displays the names of the function arguments', function () {
				const inputsWrapper = wrapper.findAll( '[data-testid="function-input-name"]' );

				expect( inputsWrapper.length ).toBe( 1 );
				expect( inputsWrapper[ 0 ].text() ).toBe( 'String to reverse' );
			} );

			it( 'it displays the types of the function arguments', function () {
				const inputsWrapper = wrapper.findAll( '[data-testid="function-input-type"]' );

				expect( inputsWrapper.length ).toBe( 1 );
				expect( inputsWrapper[ 0 ].text() ).toBe( 'String' );
			} );

			it( 'the link to the input type should redirect to the page that represents the type of the input', function () {
				const inputWrapper = wrapper.find( '[data-testid="function-input-type"]' );

				expect( inputWrapper.attributes() ).toHaveProperty( 'href' );
				expect( inputWrapper.attributes().href ).toContain( 'Z6' );
			} );

			it( 'it displays the output of the function', function () {
				const outputWrapper = wrapper.find( '[data-testid="function-output"]' );

				expect( outputWrapper.text() ).toBe( 'String' );
			} );
			it( 'the link to the output type should redirect to the page that represents the type of the input', function () {
				const outputWrapper = wrapper.find( '[data-testid="function-output"]' );

				expect( outputWrapper.attributes() ).toHaveProperty( 'href' );
				expect( outputWrapper.attributes().href ).toContain( 'Z6' );
			} );

		} );
	} );

	describe( 'Zero-blank state', function () {
		describe( 'when no valid function was found', function () {
			it( 'should display a zero-blank state', function () {
				const wrapper = createFunctionExplorerWrapper(
					{ edit: true },
					$.extend( mockFunctionExplorerComputed, {
						functionExists: jest.fn( () => false )
					} )
				);

				const inputsWrapper = wrapper.findAll( '[data-testid="function-input-type"]' );
				expect( inputsWrapper.length ).toBe( 0 );

				const outputWrapper = wrapper.find( '[data-testid="function-output"]' );
				expect( outputWrapper.exists() ).toBe( false );
			} );
		} );
	} );

} );
