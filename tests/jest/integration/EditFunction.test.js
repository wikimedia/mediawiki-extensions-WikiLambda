/*!
 * WikiLambda integration test for editing a function.
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
const PublishDialog = require( '../../../resources/ext.wikilambda.app/components/widgets/publish/PublishDialog.vue' );
const { chipInputAddChip, lookupSearchAndSelect, textInputChange } = require( './helpers/interactionHelpers.js' );
const { runSetup, runTeardown } = require( './helpers/functionEditorTestHelpers.js' );
const existingFunctionFromApi = require( './objects/existingFunctionFromApi.js' );
const expectedEditedFunctionPostedToApi = require( './objects/expectedEditedFunctionPostedToApi.js' );

const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

describe( 'WikiLambda frontend, editing an existing function, on function-editor view', () => {
	let apiPostWithEditTokenMock;

	beforeEach( () => {
		const pageConfig = {
			createNewPage: false,
			title: functionZid,
			queryParams: {
				action: Constants.ACTIONS.EDIT,
				title: functionZid
			}
		};
		const setupResult = runSetup( pageConfig );
		apiPostWithEditTokenMock = setupResult.apiPostWithEditTokenMock;

		// Mock the navigateToPage method in PublishDialog.vue to suppress navigation errors from JSDOM
		if ( PublishDialog && PublishDialog.methods ) {
			jest.spyOn( PublishDialog.methods, 'navigateToPage' ).mockImplementation( () => {} );
		}
	} );

	afterEach( () => {
		runTeardown();
	} );

	it( 'allows editing the function, making use of most important features', async () => {
		const {
			findByRole,
			findAllByTestId,
			getByText
		} = render( App );

		// ACT: Get the language blocks
		let languageBlocks = await findAllByTestId( 'function-editor-language-block' );

		// ASSERT: There are two language blocks
		expect( languageBlocks.length ).toBe( 2 );
		const chineseLanguageBlock = languageBlocks[ 0 ];

		// ACT: Change the first argument type.
		const chineseFirstArgumentType = within( chineseLanguageBlock ).getAllByTestId( 'function-editor-input-item-type' )[ 0 ];
		await lookupSearchAndSelect( chineseFirstArgumentType, 'Str', 'Monolingual stringset' );

		// ASSERT: Correct value is selected
		expect( within( chineseFirstArgumentType ).getByRole( 'combobox' ).value ).toBe( 'Monolingual stringset' );

		// ACT: Click publish button.
		await fireEvent.click( getByText( 'Publish' ) );

		// ASSERT: The warning message is shown in the dialog indicating the user has changed the argument type.
		let publishDialog = await findByRole( 'dialog' );
		expect( publishDialog ).toHaveTextContent( 'You changed the input field of this function.' );

		// ACT: Close publish dialog.
		await fireEvent.click( within( publishDialog ).getByText( 'Cancel' ) );

		// ACT: Change the first argument type back to the original type.
		await lookupSearchAndSelect( chineseFirstArgumentType, 'Str', 'String' );

		// ACT: Edit the name of the function in Chinese (the first language).
		const chineseNameBlock = within( chineseLanguageBlock ).getByTestId( 'function-editor-name-input' );
		await textInputChange( chineseNameBlock, 'edited function name, in Chinese' );

		// ACT: Add a second alias for the function in Chinese.
		const chineseAliasInput = within( chineseLanguageBlock ).getByTestId( 'function-editor-alias-input' );
		await chipInputAddChip( chineseAliasInput, 'second function alias, in Chinese' );

		// ACT: Add a label for the first argument in Chinese.
		const chineseFirstArgumentLabel = within( chineseLanguageBlock ).getAllByTestId( 'function-editor-input-item-label' )[ 0 ];
		await textInputChange( chineseFirstArgumentLabel, 'newly added first argument label, in Chinese' );

		// ACT: Edit the label for the first argument in Afrikaans (the second language).
		const afrikaansLanguageBlock = languageBlocks[ 1 ];
		const afrikaansFirstArgumentLabel = within( afrikaansLanguageBlock ).getAllByTestId( 'function-editor-input-item-label' )[ 0 ];
		await textInputChange( afrikaansFirstArgumentLabel, 'edited first argument label, in Afrikaans' );

		// ACT: Click "Add language".
		await fireEvent.click( getByText( 'Add language' ) );

		// ASSERT: A new language block is created
		languageBlocks = await findAllByTestId( 'function-editor-language-block' );
		expect( languageBlocks.length ).toBe( 3 );
		let frenchBlock = languageBlocks[ 2 ];

		// ACT: Select French as a french natural language.
		const frenchLanguageSelector = await within( frenchBlock ).findByTestId( 'function-editor-language-selector' );
		await lookupSearchAndSelect( frenchLanguageSelector, 'Fren', 'French' );

		// ACT: Refresh language block
		// (becaue of :key, Vue re-renders the component when selecting a language)
		languageBlocks = await findAllByTestId( 'function-editor-language-block' );
		frenchBlock = languageBlocks[ 2 ];

		// ACT: Enter a name in French.
		const frenchNameInputBlock = await within( frenchBlock ).findByTestId( 'function-editor-name-input' );
		await textInputChange( frenchNameInputBlock, 'function name, in French' );

		// ACT: Enter an alias in French.
		const frenchAliasBlock = await within( frenchBlock ).findByTestId( 'function-editor-alias-input' );
		await chipInputAddChip( frenchAliasBlock, 'function alias, in French' );

		// TODO: Remove settimeout and use jest.useFakeTimers instead
		setTimeout( async () => {
			// ACT: Click publish button.
			await fireEvent.click( getByText( 'Publish' ) );

			// ACT: Add a summary of your changes.
			publishDialog = await findByRole( 'dialog' );
			await fireEvent.update(
				within( publishDialog ).getByLabelText( 'How did you improve this page?' ),
				'my changes summary' );

			// ACT: Click publish button in dialog.
			await fireEvent.click( within( publishDialog ).getByText( 'Publish' ) );

			// ASSERT: Location is changed to page returned by API.
			await waitFor( () => expect( window.location.href ).toEqual( '/view/en/newPage?success=true' ) );

			// ASSERT: Correct ZID and ZObject were posted to the API.
			expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				format: 'json',
				formatversion: '2',
				uselang: 'en',
				summary: 'my changes summary',
				zid: functionZid,
				zobject: JSON.stringify( expectedEditedFunctionPostedToApi )
			} );
		}, 100 );
	} );
} );
