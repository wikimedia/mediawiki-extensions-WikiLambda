/*!
 * WikiLambda integration test for evaluating a function call on the Special: Evaluate Function Call page.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

require( '@testing-library/jest-dom' );

const { fireEvent, render } = require( '@testing-library/vue' ),
	{ within } = require( '@testing-library/dom' ),
	{ clickLookupResult } = require( './helpers/interactionHelpers.js' ),
	{ runSetup, runTeardown } = require( './helpers/runFunctionTestHelpers.js' ),
	store = require( '../../../resources/ext.wikilambda.edit/store/index.js' ),
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	expectedFunctionCallPostedToApi = require( './objects/expectedFunctionCallPostedToApi.js' );

describe( 'WikiLambda frontend, running a function on Run Function Special page', () => {
	let apiPostWithFunctionCallMock;

	beforeEach( () => {
		const setupResult = runSetup();
		apiPostWithFunctionCallMock = setupResult.apiPostWithFunctionCallMock;
	} );

	afterEach( () => {
		runTeardown();
	} );

	it( 'allows choosing a function and calling it', async () => {
		const { findByRole, findByText, findByTestId } =
			render( App, { global: { plugins: [ store ] } } );

		// ACT: Select a function
		const functionSelectorBlock = await findByTestId( 'function-evaluator-call' );
		const functionSelector = within( functionSelectorBlock ).getByRole( 'combobox' );
		const functionName = 'function name, in Chinese';

		await fireEvent.update( functionSelector, functionName );
		await clickLookupResult( functionSelectorBlock, functionName );

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

		// ACT: Enter a value for the second input
		const secondInputText = 'second argument value';
		await fireEvent.update( secondInputTextField, secondInputText );

		// ASSERT: Check the value of the second input is correctly set
		expect( secondInputTextField.value ).toBe( secondInputText );

		//* -- Calling the function
		// ACT: Click the Run Function button.
		const runFunctionButton = await findByRole( 'button', { name: 'Run function' } );
		await fireEvent.click( runFunctionButton );

		// ASSERT: The correct function call is sent to the API with the newly input values.
		expect( apiPostWithFunctionCallMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			wikilambda_function_call_zobject: JSON.stringify( expectedFunctionCallPostedToApi )
		} );

		//* -- Checking the response
		const resultBlock = await findByTestId( 'function-evaluator-result' );

		// ASSERT: The 'Running...' message is displayed.
		expect( await within( resultBlock ).findByText( 'Running...' ) ).toBeInTheDocument();

		// ASSERT: Eventually the result is displayed
		expect( await findByText( '"the function call result"' ) ).toBeInTheDocument();

		// ACT: Click the show metrics button.
		const detailsLink = await within( resultBlock ).findByRole( 'button', { name: 'Details' } );
		await fireEvent.click( detailsLink );

		// ASSERT: The metadata is displayed in the dialog.
		const detailsDialog = await findByRole( 'dialog' );
		expect( detailsDialog ).toHaveTextContent( 'Orchestration start time: 11 seconds ago' );
		expect( detailsDialog ).toHaveTextContent( 'Orchestration end time: 2 seconds ago' );
		expect( detailsDialog ).toHaveTextContent( 'Orchestration duration: 146ms' );
	} );
} );
