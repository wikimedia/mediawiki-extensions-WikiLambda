/*!
 * WikiLambda unit test suite for the FunctionExplorer component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	LabelData = require( '../../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' ),
	FunctionExplorer = require( '../../../../../resources/ext.wikilambda.app/components/widgets/function-explorer/FunctionExplorer.vue' ),
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../../helpers/getterHelpers.js' ).createLabelDataMock,
	shallowMount = require( '@vue/test-utils' ).shallowMount,
	useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

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

function createFunctionExplorerWrapper( propsData = {} ) {
	return shallowMount( FunctionExplorer, {
		propsData: propsData,
		global: { stubs: { WlWidgetBase: false, CdxButton: false, WlTypeToString: false } }
	} );
}

describe( 'FunctionExplorer', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getLabelData = createLabelDataMock( {
			Z6: 'String',
			Z881: 'Typed list',
			Z10002: 'Is reverse string',
			Z10002K1: 'String one',
			Z10002K2: 'String two',
			Z10004: 'Reverse string',
			Z10004K1: 'String to reverse'
		} );
		store.getUserLangCode = 'en';
		store.getStoredObject = ( zid ) => zid === reverseStringFunctionZid ?
			reverseStringFunction :
			isReverseStringFunction;
		store.getInputsOfFunctionZid = ( zid ) => zid === reverseStringFunctionZid ?
			reverseStringFunctionArguments :
			isReverseStringFunctionArguments;
		window.open = jest.fn();
	} );

	it( 'renders without errors', () => {
		const wrapper = createFunctionExplorerWrapper();

		expect( wrapper.find( '.ext-wikilambda-app-function-explorer-widget' ).exists() ).toBe( true );
	} );

	describe( 'Edit mode', () => {
		it( 'should display a view function button', () => {
			const wrapper = createFunctionExplorerWrapper( {
				functionZid: reverseStringFunctionZid,
				edit: true
			} );

			const buttonViewFunction = wrapper.find( '[data-testid="button-view-function"]' );

			expect( buttonViewFunction.exists() ).toBe( true );
		} );

		it( 'should redirect to the function page when the view function button is clicked', () => {
			const wrapper = createFunctionExplorerWrapper( {
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
				wrapper = createFunctionExplorerWrapper( propsData );
			} );

			it( 'should update the function name', () => {
				expect( wrapper.vm.functionLabel.label ).toBe( 'Reverse string' );
				wrapper.setData( { currentFunctionZid: isReverseStringFunctionZid } );
				expect( wrapper.vm.functionLabel.label ).toBe( 'Is reverse string' );
			} );

			it( 'should update the function inputs', () => {
				expect( wrapper.vm.functionArguments ).toEqual( [ {
					key: 'Z10004K1',
					type: 'Z6',
					label: new LabelData( 'Z10004K1', 'String to reverse', 'Z1002', 'en' )
				} ] );
				wrapper.setData( { currentFunctionZid: isReverseStringFunctionZid } );
				expect( wrapper.vm.functionArguments ).toEqual( [ {
					key: 'Z10002K1',
					type: 'Z6',
					label: new LabelData( 'Z10002K1', 'String one', 'Z1002', 'en' )
				}, {
					key: 'Z10002K2',
					type: 'Z6',
					label: new LabelData( 'Z10002K2', 'String two', 'Z1002', 'en' )
				} ] );
			} );

			it( 'should update the function output', () => {
				expect( wrapper.vm.outputType ).toBe( Constants.Z_STRING );
				wrapper.setData( { currentFunctionZid: isReverseStringFunctionZid } );
				expect( wrapper.vm.outputType ).toBe( Constants.Z_BOOLEAN );
			} );
		} );

		describe( 'Implementation: Code', () => {
			let wrapper;

			beforeEach( () => {
				wrapper = createFunctionExplorerWrapper( {
					functionZid: reverseStringFunctionZid,
					edit: true,
					implementation: Constants.Z_IMPLEMENTATION_CODE
				} );
			} );

			describe( 'when a valid functionZid is provided', () => {
				beforeAll( () => {
					Object.defineProperty( navigator, 'clipboard', {
						value: {
							writeText: jest.fn()
						}
					} );

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

			beforeEach( () => {
				wrapper = createFunctionExplorerWrapper(
					{
						functionZid: reverseStringFunctionZid,
						edit: true
					}
				);

				resetButton = wrapper.find( '[data-testid="function-explorer-reset-button"]' );
			} );

			it( 'should have a reset button', () => {
				expect( resetButton.exists() ).toBe( true );
			} );

			describe( 'when a functionZid was specified in the FunctionExplorer and the reset button is clicked', () => {
				it( 'should reset the inputs of the function to the originally selected function', () => {
					// TODO: Change the selected function before clicking the reset button
					// const functionSelector = wrapper.findComponent( ZObjectSelector );

					resetButton.trigger( 'click' );

					const inputsWrapper = wrapper.findAll( '[data-testid="function-input-type"]' );

					expect( inputsWrapper.length ).toBe( 1 );
					expect( inputsWrapper[ 0 ].text() ).toBe( 'String' );
				} );

				it( 'should reset the output of the function to the originally selected function', () => {
					// TODO: Change the selected function before clicking the reset button
					// const functionSelector = wrapper.findComponent( ZObjectSelector );

					resetButton.trigger( 'click' );

					const outputWrapper = wrapper.find( '[data-testid="function-output"]' );

					expect( outputWrapper.text() ).toBe( 'String' );
				} );

			} );

			describe( 'when a functionZid was NOT provided in the FunctionExplorer and the reset button is clicked', () => {
				it( 'should do nothing', () => {

				} );
			} );
		} );
	} );

	describe( 'Read mode', () => {

		it( 'should NOT display the lookup used to select a function', () => {
			const wrapper = createFunctionExplorerWrapper(
				{
					functionZid: reverseStringFunctionZid,
					edit: false
				}
			);

			expect( wrapper.find( '[data-testid="function-selector"]' ).exists() ).toBe( false );
		} );

		describe( 'when a valid functionZid is provided', () => {
			let wrapper;
			beforeEach( () => {
				wrapper = createFunctionExplorerWrapper(
					{
						functionZid: reverseStringFunctionZid,
						edit: false
					}
				);
			} );

			it( 'displays the name of the function', () => {
				const functionName = wrapper.find( '[data-testid="function-name"]' ).text();
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

				const wrapper = createFunctionExplorerWrapper(
					{ edit: true }
				);

				const inputsWrapper = wrapper.findAll( '[data-testid="function-input-type"]' );
				expect( inputsWrapper.length ).toBe( 0 );

				const outputWrapper = wrapper.find( '[data-testid="function-output"]' );
				expect( outputWrapper.exists() ).toBe( false );
			} );
		} );
	} );
} );
