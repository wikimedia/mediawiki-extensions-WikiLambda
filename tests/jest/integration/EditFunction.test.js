/*!
 * WikiLambda integration test for editing a function.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

require( '@testing-library/jest-dom' );

const { fireEvent, render, waitFor } = require( '@testing-library/vue' ),
	{ within } = require( '@testing-library/dom' ),
	{ clickLookupResult } = require( './helpers/interactionHelpers.js' ),
	{ runSetup, runTeardown } = require( './helpers/functionEditorTestHelpers.js' ),
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	store = require( '../../../resources/ext.wikilambda.edit/store/index.js' ),
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	apiGetMock = require( './helpers/apiGetMock.js' ),
	ApiMock = require( './helpers/apiMock.js' ),
	existingFunctionFromApi = require( './objects/existingFunctionFromApi.js' ),
	expectedEditedFunctionPostedToApi = require( './objects/expectedEditedFunctionPostedToApi.js' );

const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

const lookupZObjectTypeLabels =
	new ApiMock( apiGetMock.typeLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const lookupZObjectLanguageLabels =
	new ApiMock( apiGetMock.languageLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );
const fetchZImplementations =
	new ApiMock( apiGetMock.fetchZImplementationsRequest,
		apiGetMock.zObjectSearchResponse, apiGetMock.zObjectSearchMatcher );
const fetchZTesters =
	new ApiMock( apiGetMock.fetchZTestersRequest, apiGetMock.zObjectSearchResponse, apiGetMock.zObjectSearchMatcher );
const performTest =
	new ApiMock( apiGetMock.performTestRequest, apiGetMock.performTestResponse, apiGetMock.performTestMatcher );

describe( 'WikiLambda frontend, editing an existing function, on function-editor view', () => {
	let apiPostWithEditTokenMock;

	beforeEach( () => {
		const setupResult = runSetup();
		apiPostWithEditTokenMock = setupResult.apiPostWithEditTokenMock;

		mw.Api = jest.fn( () => {
			return {
				postWithEditToken: apiPostWithEditTokenMock,
				get: apiGetMock.createMockApi( [
					lookupZObjectLanguageLabels,
					lookupZObjectTypeLabels,
					initializeRootZObject,
					fetchZImplementations,
					fetchZTesters,
					performTest ] )
			};
		} );

		window.mw.Uri = jest.fn( () => {
			return {
				query: {
					action: Constants.ACTIONS.EDIT,
					title: functionZid
				},
				path: new window.mw.Title( functionZid ).getUrl( {
					title: functionZid, action: Constants.ACTIONS.EDIT
				} )
			};
		} );

		global.mw.config.get = ( endpoint ) => {
			switch ( endpoint ) {
				case 'wgWikiLambda':
					return {
						zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
						zlang: 'en',
						zId: functionZid
					};
				default:
					return {};
			}
		};
	} );

	afterEach( () => {
		runTeardown();
	} );

	it( 'allows editing the function, making use of most important features', async () => {
		const { findByRole, getAllByLabelText, getByText, findAllByRole, findAllByTestId } =
			render( App, { global: { plugins: [ store ] } } );

		// ACT: Change the first argument type.
		const chineseArgumentsArea = ( await findAllByRole( 'inputs-container' ) )[ 0 ];
		const firstArgumentTypeInput = within( chineseArgumentsArea ).getAllByDisplayValue( 'String' )[ 0 ];
		await fireEvent.update( firstArgumentTypeInput, 'Str' );
		await clickLookupResult( chineseArgumentsArea, 'Monolingual stringset' );

		// ACT: Click publish button.
		await fireEvent.click( getByText( 'Publish' ) );

		// ASSERT: The warning message is shown in the dialog indicating the user has changed the argument type.
		let publishDialog = await findByRole( 'dialog' );
		expect( publishDialog ).toHaveTextContent( 'You changed the input field of this function.' );

		// ACT: Close publish dialog.
		await fireEvent.click( within( publishDialog ).getByText( 'Cancel' ) );

		// ACT: Change the first argument type back to the original type.
		await fireEvent.update( firstArgumentTypeInput, 'Str' );
		await clickLookupResult( chineseArgumentsArea, 'String' );

		// ACT: Edit the name of the function in Chinese (the first language).
		await fireEvent.update( getAllByLabelText( 'Name (optional)' )[ 0 ], 'edited function name, in Chinese' );

		// ACT: Add a second alias for the function in Chinese.
		const chineseAliasInput = getAllByLabelText( 'New alias' )[ 0 ];
		await fireEvent.update( chineseAliasInput, 'second function alias, in Chinese' );
		await fireEvent.keyDown( chineseAliasInput, { key: 'enter' } );

		// ACT: Add a label for the first argument in Chinese.
		await fireEvent.update(
			within( chineseArgumentsArea ).getAllByPlaceholderText( 'E.g. Celsius' )[ 0 ],
			'newly added first argument label, in Chinese' );

		// ACT: Edit the label for the first argument in Afrikaans (the second language).
		const afrikaansArgumentsArea = ( await findAllByRole( 'inputs-container' ) )[ 1 ];
		await fireEvent.update(
			within( afrikaansArgumentsArea ).getAllByPlaceholderText( 'E.g. Celsius' )[ 0 ],
			'edited first argument label, in Afrikaans' );

		// ACT: Click "Add labels in another language".
		await fireEvent.click( getByText( 'Add labels in another language' ) );

		// ASSERT: A new language block is created
		const functionDefinitionLangBlocks = await findAllByTestId( 'function-editor-definition-language-block' );
		expect( functionDefinitionLangBlocks.length ).toBe( 3 );
		const thirdBlock = functionDefinitionLangBlocks[ 2 ];

		// ACT: Select French as a third natural language.
		const thirdLanguageSelector = within( thirdBlock ).getByTestId( 'function-editor-language-selector' );
		await fireEvent.update( within( thirdLanguageSelector ).getByRole( 'combobox' ), 'Fren' );
		await clickLookupResult( thirdLanguageSelector, 'French' );

		// ACT: Enter a name in French.
		const thirdNameInputBlock = within( thirdBlock ).getByTestId( 'function-editor-name-input' );
		const thirdNameInput = within( thirdNameInputBlock ).getByRole( 'textbox' );
		await fireEvent.update( thirdNameInput, 'function name, in French' );

		// ACT: Enter an alias in French.
		const thirdAliasBlock = within( thirdBlock ).getByTestId( 'function-editor-alias-input' );
		const thirdAliasInput = await within( thirdAliasBlock ).getByRole( 'textbox' );
		await fireEvent.update( thirdAliasInput, 'function alias, in French' );
		await fireEvent.keyDown( thirdAliasInput, { key: 'enter' } );

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
				summary: 'my changes summary',
				zid: functionZid,
				zobject: JSON.stringify( expectedEditedFunctionPostedToApi )
			} );
		}, 100 );
	} );
} );
