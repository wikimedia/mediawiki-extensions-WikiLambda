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
const expectedNewFunctionPostedToApi = require( './objects/expectedNewFunctionPostedToApi.js' );

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

	it( 'allows creating a new function, making use of most important features', async () => {
		const {
			container,
			findAllByTestId,
			findByRole,
			getAllByTestId,
			getByText
		} = render( App );

		// Wait for loading to finish (max 5 seconds)
		await waitFor( () => expect( container ).not.toHaveTextContent( 'Loading data' ), { timeout: 5000 } );

		// ACT: Get First language block. Selected by default: English
		let languageBlocks = await findAllByTestId( 'function-editor-language-block' );
		const firstLanguageBlock = languageBlocks[ 0 ];

		// ACT: Enter a name for the function in English
		const firstNameInputBlock = within( firstLanguageBlock ).getByTestId( 'function-editor-name-input' );
		await textInputChange( firstNameInputBlock, 'function name, in English' );

		// ACT: Enter a description for the function in English.
		const firstDescriptionInputBlock = within( firstLanguageBlock ).getByTestId( 'function-editor-description-input' );
		await textInputChange( firstDescriptionInputBlock, 'function description, in English' );

		// ACT: Enter an alias for the function in English.
		const aliasInputBlock = within( firstLanguageBlock ).getByTestId( 'function-editor-alias-input' );
		await chipInputAddChip( aliasInputBlock, 'function alias, in English' );

		const argumentsArea = within( firstLanguageBlock ).getByTestId( 'function-editor-inputs' );

		// ACT: Select a type for the first argument.
		const firstArgType = within( firstLanguageBlock ).getByTestId( 'function-editor-input-item-type' );
		await lookupSearchAndSelect( firstArgType, 'Str', 'String' );

		// ACT: Enter a label for the first argument in English.
		const firstArgLabel = within( argumentsArea ).getByTestId( 'function-editor-input-item-label' );
		await textInputChange( firstArgLabel, 'first argument label, in English' );

		// ACT: Add another argument.
		await fireEvent.click( getByText( 'Add another input' ) );

		// ASSERT there are two inputs
		const argumentItems = await within( argumentsArea ).findAllByTestId( 'function-editor-input-item' );
		expect( argumentItems.length ).toEqual( 2 );
		const secondArg = argumentItems[ 1 ];

		// ACT: Select a type for the second argument.
		const secondArgType = within( secondArg ).getByTestId( 'function-editor-input-item-type' );
		await lookupSearchAndSelect( secondArgType, 'Str', 'String' );

		// ACT: Enter a label for the second argument in English.
		const secondArgLabel = within( secondArg ).getByTestId( 'function-editor-input-item-label' );
		await textInputChange( secondArgLabel, 'second argument label, in English' );

		// ACT: Select a type for the output.
		const outputArea = within( firstLanguageBlock ).getByTestId( 'function-editor-output' );
		await lookupSearchAndSelect( outputArea, 'Str', 'String' );

		// ACT: Click "Add language".
		await fireEvent.click( getByText( 'Add language' ) );

		// ACT: Select French as the second natural language.
		const secondLanguageSelector = getAllByTestId( 'function-editor-language-selector' )[ 1 ];
		await lookupSearchAndSelect( secondLanguageSelector, 'Fren', 'French' );

		languageBlocks = await findAllByTestId( 'function-editor-language-block' );
		const secondLanguageBlock = languageBlocks[ 1 ];

		// ACT: Enter a name in French.
		const secondNameInput = within( secondLanguageBlock ).getByTestId( 'function-editor-name-input' );
		await textInputChange( secondNameInput, 'function name, in French' );

		// ACT: Enter a description for the function in French.
		const secondDescriptionInput = within( secondLanguageBlock ).getByTestId( 'function-editor-description-input' );
		await textInputChange( secondDescriptionInput, 'function description, in French' );

		// ACT: Enter an alias in French
		const frenchAliasInput = within( secondLanguageBlock ).getByTestId( 'function-editor-alias-input' );
		await chipInputAddChip( frenchAliasInput, 'function alias, in French' );

		// ACT: Enter a label for the first argument, in French.
		const frenchArgumentLabels = within( secondLanguageBlock ).getAllByTestId( 'function-editor-input-item-label' );
		const firstFrenchArgLabel = frenchArgumentLabels[ 0 ];
		await textInputChange( firstFrenchArgLabel, 'first argument label, in French' );

		// ACT: Enter a label for the second argument, in French.
		const secondFrenchArgLabel = frenchArgumentLabels[ 1 ];
		await textInputChange( secondFrenchArgLabel, 'second argument label, in French' );

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
			zobject: JSON.stringify( expectedNewFunctionPostedToApi )
		}, { signal: undefined } );
	} );
} );
