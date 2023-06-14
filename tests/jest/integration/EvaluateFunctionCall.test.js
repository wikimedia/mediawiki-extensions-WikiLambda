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
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	store = require( '../../../resources/ext.wikilambda.edit/store/index.js' ),
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	apiGetMock = require( './helpers/apiGetMock.js' ),
	ApiMock = require( './helpers/apiMock.js' ),
	expectedFunctionCallPostedToApi = require( './objects/expectedFunctionCallPostedToApi.js' ),
	functionCallResultFromApi = require( './objects/functionCallResultFromApi.js' );

const lookupZObjectTypeLabels =
	new ApiMock( apiGetMock.functionLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );

describe( 'Wikilambda frontend, running a function on evaluate function call view', () => {
	let apiPostWithFunctionCallMock;
	beforeEach( () => {
		// Needed because of the Teleported dialog component.
		const el = document.createElement( 'div' );
		el.id = 'ext-wikilambda-app';
		document.body.appendChild( el );

		jest.useFakeTimers().setSystemTime( new Date( '2022-11-09T19:56:53Z' ) );

		apiPostWithFunctionCallMock = jest.fn( () => Promise.resolve(
			{
				query: {
					wikilambda_function_call: { success: '',
						data: JSON.stringify( functionCallResultFromApi )
					}
				}
			}
		) );

		mw.Api = jest.fn( () => {
			return {
				post: apiPostWithFunctionCallMock,
				get: apiGetMock.createMockApi( [
					lookupZObjectTypeLabels,
					initializeRootZObject ] )
			};
		} );

		window.mw.Uri.mockImplementation( () => {
			return {
				path: new window.mw.Title( Constants.PATHS.EVALUATE_FUNCTION_CALL_TITLE ).getUrl(),
				query: {}
			};
		} );

		global.mw.config.get = ( endpoint ) => {
			switch ( endpoint ) {
				case 'wgWikiLambda':
					return {
						evaluateFunctionCall: true,
						viewmode: false
					};
				default:
					return {};
			}
		};

		mw.internalWikiUrlencode = jest.fn( ( url ) => url );
	} );

	afterEach( () => {
		// Clear the element that was added for the Teleported dialog component.
		document.body.outerHTML = '';
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	} );

	it.skip( 'allows choosing a function and calling it', async () => {
		const { findByRole, findByText, getByText, queryByText, findByTestId } =
			render( App, { global: { plugins: [ store ] } } );

		// Using findByTestId because we need to wait for it to be rendered
		const functionCallContentContainer = await findByTestId( 'z-object-key-value' );

		// ACT: Click select function link button
		const selectFunctionLinkContainer = await within( functionCallContentContainer ).findByTestId( 'z-object-to-string' );
		const selectFunctionLink = selectFunctionLinkContainer.getElementsByTagName( 'a' )[ 0 ];

		await fireEvent.click( selectFunctionLink );

		// ACT: Lookup function name and select it.
		const functionSelectorContainer = within( functionCallContentContainer ).getByTestId( 'z-reference-selector' );
		const functionSelector = await within( functionSelectorContainer ).getByRole( 'combobox' );

		const functionNameToSelect = 'function name, in Chinese';

		await fireEvent.update( functionSelector, functionNameToSelect );
		await clickLookupResult( functionSelectorContainer, functionNameToSelect );

		// ASSERT: Check that the correct function is selected
		expect( functionSelector.value ).toBe( functionNameToSelect );

		// ASSERT: Confirm whether the function's arguments are displayed
		const zObjectKeyValueSet = await within( functionCallContentContainer ).getByTestId( 'z-object-key-value-set' );
		const zObjectAccordionList = await within( zObjectKeyValueSet ).getAllByTestId( 'z-object-key-value' );

		expect( zObjectAccordionList ).toHaveLength( 4 ); // Includes 2 arguments, 1 function name, 1 function type

		//* -- First argument
		// The first argument is the third accordion in the list (the first is the composition type and the second is the composition function)
		const firstArgumentAccordion = zObjectAccordionList[ 2 ];
		const firstArgumentAccordionToggleButton = await within( firstArgumentAccordion ).getByTestId( 'expanded-toggle' );

		await fireEvent.click( firstArgumentAccordionToggleButton );

		// ASSERT: First argument is displayed with correct type.
		const firstArgumentTypeSelect = await within( firstArgumentAccordion ).getByTestId( 'z-object-type-select' );
		expect( within( firstArgumentTypeSelect ).getByRole( 'textbox' ).innerHTML ).toBe( 'String' );

		// ACT: Enter a value for the first argument.
		const firstArgumentInput = await within( firstArgumentAccordion ).getByTestId( 'text-input' );
		const firstArgumentExpectedInput = 'first argument value';
		await fireEvent.update( firstArgumentInput, firstArgumentExpectedInput );

		// ASSERT: Check the value of the first argument is correctly set
		expect( firstArgumentInput.value ).toBe( firstArgumentExpectedInput );

		//* -- Second argument
		// The second argument is the third accordion in the list (the first is the composition type and the second is the composition function)
		const secondArgumentAccordion = zObjectAccordionList[ 3 ];
		const secondArgumentAccordionToggleButton = await within( secondArgumentAccordion ).getByTestId( 'expanded-toggle' );

		await fireEvent.click( secondArgumentAccordionToggleButton );

		// ASSERT: Second argument is displayed with correct type.
		const secondArgumentTypeSelect = await within( secondArgumentAccordion ).getByTestId( 'z-object-type-select' );
		expect( within( secondArgumentTypeSelect ).getByRole( 'textbox' ).innerHTML ).toBe( 'String' );

		// ACT: Enter a value for the second argument.
		const secondArgumentInput = await within( secondArgumentAccordion ).getByTestId( 'text-input' );
		const secondArgumentExpectedInput = 'second argument value';
		await fireEvent.update( secondArgumentInput, secondArgumentExpectedInput );

		// ASSERT: Check the value of the second argument is correctly set
		expect( secondArgumentInput.value ).toBe( secondArgumentExpectedInput );

		//* -- Calling the function
		//* -- Publish section
		// ACT: Publish the implementation
		const publishButton = await findByTestId( 'publish-button' );
		await fireEvent.click( publishButton );

		// TODO: ACT: Click the Call Function button.
		// const callFunctionButton = await findByText( 'Call Function' );
		// await fireEvent.click( callFunctionButton );

		// TODO: ASSERT: The correct function call is sent to the API with the newly input values.
		expect( apiPostWithFunctionCallMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			wikilambda_function_call_zobject: JSON.stringify( expectedFunctionCallPostedToApi )
		} );

		// TODO: ASSERT: The performing orchestration message is displayed.
		expect( queryByText( 'Performing orchestration, please wait' ) ).toBeInTheDocument();

		// TODO: ASSERT: Eventually the orchestration is displayed as completed.
		expect( await findByText( 'Orchestration result' ) ).toBeInTheDocument();

		// TODO: ASSERT: The result from the function call is displayed.
		expect( queryByText( 'the function call result' ) ).toBeInTheDocument();

		// TODO: ACT: Click the show metrics button.
		await fireEvent.click( getByText( 'Show metrics' ) );

		// TODO: ASSERT: The metadata is displayed in the dialog.
		const dialog = await findByRole( 'dialog' );
		expect( dialog ).toHaveTextContent( 'Orchestration start time: 11 seconds ago' );
		expect( dialog ).toHaveTextContent( 'Orchestration end time: 2 seconds ago' );
		expect( dialog ).toHaveTextContent( 'Orchestration duration: 146ms' );
	} );
} );
