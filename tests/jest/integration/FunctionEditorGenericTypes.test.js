/*!
 * WikiLambda integration test for creating new function with
 * generic types for inputs and output types.
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
const { lookupSearchAndSelect } = require( './helpers/interactionHelpers.js' );
const { runSetup, runTeardown } = require( './helpers/functionEditorTestHelpers.js' );
const expectedGenericTypeFunctionPostedToApi = require( './objects/expectedGenericTypeFunctionPostedToApi.js' );

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

	it( 'handles generic types during function creation, and saves a function that concats two lists of strings', async () => {
		const {
			container,
			findAllByTestId,
			findByRole,
			getByText,
			queryByRole
		} = render( App );

		// Wait for loading to finish (max 5 seconds)
		await waitFor( () => expect( container ).not.toHaveTextContent( 'Loading data' ), { timeout: 5000 } );

		const languageBlocks = await findAllByTestId( 'function-editor-language-block' );
		const firstLanguageBlock = languageBlocks[ 0 ];
		const argumentsArea = within( firstLanguageBlock ).getByTestId( 'function-editor-inputs' );
		const outputArea = within( firstLanguageBlock ).getByTestId( 'function-editor-output' );

		// ACT: Select typed list for the first argument.
		const firstArg = within( argumentsArea ).getByTestId( 'function-editor-input-item' );
		const firstArgType = within( firstArg ).getByTestId( 'function-editor-input-item-type' );
		await lookupSearchAndSelect( firstArgType, 'Type', 'Typed list' );

		// ACT: Adds a second argument
		await fireEvent.click( getByText( 'Add another input' ) );

		// ASSERT: There are two args
		const argItems = within( argumentsArea ).getAllByTestId( 'function-editor-input-item' );
		expect( argItems ).toHaveLength( 2 );

		// ACT: Select typed list for the second argument
		const secondArg = argItems[ 1 ];
		const secondArgType = within( secondArg ).getByTestId( 'function-editor-input-item-type' );
		await lookupSearchAndSelect( secondArgType, 'Type', 'Typed list' );

		// ACT: Select typed list for output
		const outputType = within( outputArea ).getByTestId( 'function-editor-output-type' );
		await lookupSearchAndSelect( outputType, 'Type', 'Typed list' );

		// ACT: Attempt to click publish button, before input type is set (invalid) [ EDGE CASE ].
		await fireEvent.click( getByText( 'Publish' ) );

		// ASSERT: Publish Dialog does not open, page has errors.
		expect( queryByRole( 'dialog' ) ).not.toBeInTheDocument();

		// ACT: Select typed list item type for first argument
		const firstArgItemType = within( firstArgType ).getAllByTestId( 'type-selector-arg' )[ 0 ];
		await lookupSearchAndSelect( firstArgItemType, 'Str', 'String' );

		// ACT: Select typed list item type for second argument
		const secondArgItemType = within( secondArgType ).getAllByTestId( 'type-selector-arg' )[ 0 ];
		await lookupSearchAndSelect( secondArgItemType, 'Str', 'String' );

		// ACT: Select typed list item type for output
		const outputItemType = within( outputType ).getAllByTestId( 'type-selector-arg' )[ 0 ];
		await lookupSearchAndSelect( outputItemType, 'Str', 'String' );

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
			zobject: JSON.stringify( expectedGenericTypeFunctionPostedToApi )
		}, { signal: undefined } );
	} );
} );
