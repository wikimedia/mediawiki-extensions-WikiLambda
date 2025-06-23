/*!
 * WikiLambda integration test for creating new function.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { fireEvent, render, waitFor } = require( '@testing-library/vue' );
const { within } = require( '@testing-library/dom' );
require( '@testing-library/jest-dom' );

const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const App = require( '../../../resources/ext.wikilambda.app/components/App.vue' );
const { chipInputAddChip, lookupSearchAndSelect, textInputChange } = require( './helpers/interactionHelpers.js' );
const { runSetup, runTeardown } = require( './helpers/functionEditorTestHelpers.js' );
const expectedNoLabelFunctionPostedToApi = require( './objects/expectedNoLabelFunctionPostedToApi.js' );

describe( 'WikiLambda frontend, on function-editor view', () => {
	let apiPostWithEditTokenMock;

	beforeEach( () => {
		const pageConfig = {
			createNewPage: true,
			title: Constants.PATHS.CREATE_OBJECT_TITLE,
			queryParams: {
				zid: Constants.Z_FUNCTION
			}
		};
		const setupResult = runSetup( pageConfig );
		apiPostWithEditTokenMock = setupResult.apiPostWithEditTokenMock;
	} );

	afterEach( () => {
		runTeardown();
	} );

	it( 'handles edge cases during editing/creation, and saves a function with no labels successfully', async () => {
		const {
			findAllByTestId,
			findByRole,
			getByText,
			queryByRole
		} = render( App );

		// ACT: Get First language block. Selected by default: English
		const languageBlocks = await findAllByTestId( 'function-editor-language-block' );
		const firstLanguageBlock = languageBlocks[ 0 ];

		// ACT: Select a type for the first argument.
		const argumentsArea = within( firstLanguageBlock ).getByTestId( 'function-editor-inputs' );
		let firstArgType = within( argumentsArea ).getByTestId( 'function-editor-input-item-type' );
		await lookupSearchAndSelect( firstArgType, 'Str', 'String' );

		// ACT: Delete the just-selected argument [ EDGE CASE ].
		await fireEvent.click( within( argumentsArea ).getByLabelText( 'Remove input' ) );

		// ASSERT: No arguments show.
		expect( within( argumentsArea ).queryByTestId( 'function-editor-input-item-type' ) ).not.toBeInTheDocument();
		expect( within( argumentsArea ).queryByText( 'String' ) ).not.toBeInTheDocument();

		// ACT: Add an argument.
		await fireEvent.click( getByText( 'Add input' ) );

		// ACT: Select a type for the first argument again.
		firstArgType = within( argumentsArea ).getByTestId( 'function-editor-input-item-type' );
		await lookupSearchAndSelect( firstArgType, 'Str', 'String' );

		// ACT: Enter an alias in English.
		const firstAliasInput = within( firstLanguageBlock ).getByTestId( 'function-editor-alias-input' );
		await chipInputAddChip( firstAliasInput, 'first function alias, in English' );

		// ACT: Delete the just-entered alias in Chinese [ EDGE CASE ].
		const removeButton = await waitFor( () => within( firstAliasInput ).findByRole( 'button', { hidden: true } ) );
		await fireEvent.click( removeButton );

		// ACT: Attempt to click publish button,  before output is set (invalid) [ EDGE CASE ].
		await fireEvent.click( getByText( 'Publish' ) );

		// ASSERT: Publish Dialog does not open.
		expect( queryByRole( 'dialog' ) ).not.toBeInTheDocument();

		// ASSERT: The error warning exists on the zobject showing the user they have not set an output type.
		const outputArea = within( firstLanguageBlock ).getByTestId( 'function-editor-output' );
		expect( outputArea ).toHaveTextContent( 'Output type is empty. Please select one.' );

		// ACT: Select a type for the output.
		await lookupSearchAndSelect( outputArea, 'Str', 'String' );

		// ACT: Add another argument.
		await fireEvent.click( getByText( 'Add another input' ) );

		// ACT: Select a label for the second argument, but not a type
		const secondArg = within( firstLanguageBlock ).getAllByTestId( 'function-editor-input-item' )[ 1 ];
		const secondArgLabel = within( secondArg ).getByTestId( 'function-editor-input-item-label' );
		await textInputChange( secondArgLabel, 'label for second argument, in English' );

		// ACT: Attempt to click publish button, before input type is set (invalid) [ EDGE CASE ].
		await fireEvent.click( getByText( 'Publish' ) );

		// ASSERT: Publish Dialog does not open.
		expect( queryByRole( 'dialog' ) ).not.toBeInTheDocument();

		// ASSERT: The error warning exists on the zobject showing the user they have not set an output type.
		expect( secondArg ).toHaveTextContent( 'Input type is empty. Please select one.' );

		// ACT: Select a type for the second argument.
		const secondArgType = within( argumentsArea ).getAllByTestId( 'function-editor-input-item-type' )[ 1 ];
		await lookupSearchAndSelect( secondArgType, 'Str', 'String' );

		// [ACT: Don't enter a label for the second argument. [ EDGE CASE ]]

		// ACT: Add another argument.
		await fireEvent.click( getByText( 'Add another input' ) );

		// ACT: Select a label for the second argument, but not a type
		const thirdArg = within( firstLanguageBlock ).getAllByTestId( 'function-editor-input-item' )[ 2 ];
		const thirdArgType = within( thirdArg ).getByTestId( 'function-editor-input-item-type' );
		await lookupSearchAndSelect( thirdArgType, 'Str', 'String' );

		// ACT: Click publish button.
		await fireEvent.click( getByText( 'Publish' ) );

		// ACT: Click publish button in dialog.
		await fireEvent.click( within( await findByRole( 'dialog' ) ).getByText( 'Publish' ) );

		// ASSERT: Location is changed to page returned by API.
		await waitFor( () => expect( window.location.href ).toEqual( '/view/en/newPage?success=true' ) );

		// ASSERT: Correct ZObject was posted to the API.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			format: 'json',
			formatversion: '2',
			uselang: 'en',
			summary: '',
			zid: undefined,
			zobject: JSON.stringify( expectedNoLabelFunctionPostedToApi )
		}, { signal: undefined } );
	} );
} );
