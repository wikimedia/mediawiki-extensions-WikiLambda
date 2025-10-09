/*!
 * WikiLambda integration test for evaluating a function call on the Special: Evaluate Function Call page.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { fireEvent, render, waitFor } = require( '@testing-library/vue' );
const { within } = require( '@testing-library/dom' );
require( '@testing-library/jest-dom' );

const App = require( '../../../resources/ext.wikilambda.app/components/App.vue' );
const { lookupSearchAndSelect } = require( './helpers/interactionHelpers.js' );
const { runSetup, runTeardown } = require( './helpers/runFunctionTestHelpers.js' );
const expectedFunctionCallPostedToApi = require( './objects/expectedFunctionCallPostedToApi.js' );

describe( 'WikiLambda frontend, running a function on Run Function Special page', () => {
	let apiPostWithFunctionCallMock;

	beforeEach( () => {
		const setupResult = runSetup();
		apiPostWithFunctionCallMock = setupResult.apiPostWithFunctionCallMock;

		// Mock navigator.clipboard for share functionality
		navigator.clipboard = {
			writeText: jest.fn()
		};
	} );

	afterEach( () => {
		runTeardown();
		jest.restoreAllMocks();
	} );

	it( 'allows choosing a function and calling it', async () => {
		const { findByRole, findByText, findByTestId } =
			render( App );

		// ACT: Select a function
		const functionSelectorBlock = await findByTestId( 'function-evaluator-call' );
		const functionSelector = within( functionSelectorBlock ).getByRole( 'combobox' );
		const functionName = 'function name, in Chinese';

		await lookupSearchAndSelect( functionSelectorBlock, functionName, functionName );

		// ASSERT: The function is selected as the function to call.
		expect( functionSelector.value ).toBe( functionName );

		// ASSERT: Confirm whether the function's two arguments are displayed
		const functionInputsBlock = await findByTestId( 'function-evaluator-inputs' );
		const functionInputs = await within( functionInputsBlock ).getAllByTestId( 'z-object-key-value' );
		expect( functionInputs ).toHaveLength( 2 );

		//* -- First Input
		// ASSERT: First input is displayed as a text input
		const firstInput = functionInputs[ 0 ];
		const firstInputTextField = await within( firstInput ).getByTestId( 'text-input' );
		expect( firstInputTextField ).toBeTruthy();

		// ACT: Enter a value for the first input
		const firstInputText = 'first argument value';
		await fireEvent.update( firstInputTextField, firstInputText );

		// ASSERT: Check the value of the first input is correctly set
		expect( firstInputTextField.value ).toBe( firstInputText );

		//* -- Second Input
		// ASSERT: second input is displayed as a text input.
		const secondInput = functionInputs[ 1 ];
		const secondInputTextField = await within( secondInput ).getByTestId( 'text-input' );
		expect( secondInputTextField ).toBeTruthy();

		// // ACT: Enter a value for the second input
		const secondInputText = 'second argument value';
		await fireEvent.update( secondInputTextField, secondInputText );

		// // ASSERT: Check the value of the second input is correctly set
		expect( secondInputTextField.value ).toBe( secondInputText );

		//* -- Calling the function
		// ACT: Click the Run Function button.
		const runFunctionButton = await findByRole( 'button', { name: 'Run function' } );
		await fireEvent.click( runFunctionButton );

		// ASSERT: The correct function call is sent to the API with the newly input values.
		await waitFor( () => expect( apiPostWithFunctionCallMock ).toHaveBeenCalledTimes( 1 ) );
		expect( apiPostWithFunctionCallMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			format: 'json',
			formatversion: '2',
			uselang: 'en',
			wikilambda_function_call_zobject: JSON.stringify( expectedFunctionCallPostedToApi )
		}, { signal: undefined } );

		// * -- Checking the response
		const resultBlock = await findByTestId( 'function-evaluator-result' );

		// ASSERT: The 'Running…' message is displayed.
		expect( await within( resultBlock ).findByText( 'Running…' ) ).toBeInTheDocument();

		// ASSERT: Eventually the result is displayed
		expect( await findByText( '"the function call result"' ) ).toBeInTheDocument();

		// ACT: Click the show metrics button.
		const detailsButton = await within( resultBlock ).findByRole( 'button', { name: 'Details' } );
		const shareButton = await within( resultBlock ).findByRole( 'button', { name: 'Copy result link' } );

		expect( detailsButton ).toBeInTheDocument();
		expect( shareButton ).toBeInTheDocument();

		// ACT: Click the show metrics button.
		await fireEvent.click( detailsButton );

		// ASSERT: The metadata is displayed in the dialog.
		const detailsDialog = await findByRole( 'dialog' );
		expect( detailsDialog ).toHaveTextContent( 'Orchestration:' );
		expect( detailsDialog ).toHaveTextContent( 'Start time: 11 seconds ago' );
		expect( detailsDialog ).toHaveTextContent( 'End time: 2 seconds ago' );
		expect( detailsDialog ).toHaveTextContent( 'Duration: 146ms' );

		// ACT: Click the share button.
		await fireEvent.click( shareButton );

		// ASSERT: The share URL is copied to the clipboard.
		await waitFor( () => {
			expect( navigator.clipboard.writeText ).toHaveBeenCalledTimes( 1 );
		} );
		const copiedUrl = navigator.clipboard.writeText.mock.calls[ 0 ][ 0 ];
		expect( copiedUrl ).toContain( '?call=' );
	} );
} );
