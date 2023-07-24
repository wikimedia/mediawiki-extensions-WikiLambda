/*!
 * WikiLambda integration test for creating new function.
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
	ApiMock = require( './helpers/apiMock.js' ),
	apiGetMock = require( './helpers/apiGetMock.js' ),
	expectedNewFunctionPostedToApi = require( './objects/expectedNewFunctionPostedToApi.js' );

const lookupZObjectTypeLabels =
	new ApiMock( apiGetMock.typeLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const lookupZObjectLanguageLabels =
	new ApiMock( apiGetMock.languageLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );

describe( 'WikiLambda frontend, on function-editor view', () => {
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
					initializeRootZObject
				] )
			};
		} );
		const queryParams = {
			zid: Constants.Z_FUNCTION
		};
		window.mw.Uri.mockImplementationOnce( function () {
			return {
				query: queryParams,
				path: new window.mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl( queryParams )
			};
		} );
	} );

	afterEach( () => {
		runTeardown();
	} );

	it( 'allows creating a new function, making use of most important features', async () => {
		const { findByLabelText, findByRole, getAllByLabelText, getByLabelText, getByText, findAllByRole } =
			render( App, { global: { plugins: [ store ] } } );

		// ACT: Select Chinese as the natural language.
		const languageSelector = await findByLabelText( 'Language' );
		await fireEvent.update( within( languageSelector ).getByRole( 'combobox' ), 'Chin' );
		await clickLookupResult( languageSelector, 'Chinese' );

		// ACT: Enter a name for the function in Chinese.
		await fireEvent.update( getByLabelText( 'Name (optional)' ), 'function name, in Chinese' );

		// ACT: Enter an alias for the function in Chinese.
		const aliasInput = within( getByLabelText( 'Alternative names (optional)' ) ).getByRole( 'textbox' );
		await fireEvent.update( aliasInput, 'function alias, in Chinese' );
		await fireEvent.keyDown( aliasInput, { key: 'enter' } );

		// ACT: Select a type for the first argument.
		const argumentsArea = await findByRole( 'inputs-container' );
		await fireEvent.update( within( argumentsArea ).getByPlaceholderText( 'Select a type' ), 'Str' );
		await clickLookupResult( argumentsArea, 'String' );

		// ACT: Enter a label for the first argument in Chinese.
		await fireEvent.update(
			within( argumentsArea ).getAllByPlaceholderText( 'E.g. Celsius' )[ 0 ],
			'first argument label, in Chinese' );

		// ACT: Add another argument.
		await fireEvent.click( getByText( 'Add another input' ) );

		// ACT: Select a type for the second argument.
		await waitFor( () => expect( within( argumentsArea ).getAllByPlaceholderText( 'Select a type' ).length ).toEqual( 2 ) );
		await fireEvent.update( within( argumentsArea ).getAllByPlaceholderText( 'Select a type' )[ 1 ], 'Str' );
		await clickLookupResult( within( argumentsArea ).getAllByRole( 'listbox', { hidden: true } )[ 1 ], 'String' );

		// ACT: Enter a label for the second argument in Chinese.
		await fireEvent.update(
			within( argumentsArea ).getAllByPlaceholderText( 'E.g. Celsius' )[ 1 ],
			'second argument label, in Chinese' );

		// ACT: Select a type for the output.
		const outputArea = getByLabelText( 'Output' );
		await fireEvent.update( within( outputArea ).getByRole( 'combobox' ), 'Str' );
		await clickLookupResult( outputArea, 'String' );

		// ACT: Click "Add labels in another language".
		await fireEvent.click( getByText( 'Add labels in another language' ) );

		// ACT: Select French as the second natural language.
		const secondLanguageSelector = getAllByLabelText( 'Language' )[ 1 ];
		await fireEvent.update( within( secondLanguageSelector ).getByRole( 'combobox' ), 'Fren' );
		await clickLookupResult( secondLanguageSelector, 'French' );

		// ACT: Enter a name in French.
		await fireEvent.update( getAllByLabelText( 'Name (optional)' )[ 1 ], 'function name, in French' );

		// ACT: Enter an alias in French
		const frenchAliasInput = within( getAllByLabelText( 'Alternative names (optional)' )[ 1 ] ).getByRole( 'textbox' );
		await fireEvent.update( frenchAliasInput, 'function alias, in French' );
		await fireEvent.keyDown( frenchAliasInput, { key: 'enter' } );

		// ACT: Enter a label for the first argument, in French.
		const frenchArgumentsArea = ( await findAllByRole( 'inputs-container' ) )[ 1 ];
		await fireEvent.update(
			within( frenchArgumentsArea ).getAllByPlaceholderText( 'E.g. Celsius' )[ 0 ],
			'first argument label, in French' );

		// ACT: Enter a label for the second argument, in French.
		await fireEvent.update(
			within( frenchArgumentsArea ).getAllByPlaceholderText( 'E.g. Celsius' )[ 1 ],
			'second argument label, in French' );

		setTimeout( async () => {
			// ACT: Click publish button.
			await fireEvent.click( getByText( 'Publish' ) );

			// ACT: Click publish button in dialog.
			await fireEvent.click( within( await findByRole( 'dialog' ) ).getByText( 'Publish' ) );

			// ASSERT: Location is changed to page returned by API.
			await waitFor( () => expect( window.location.href ).toEqual( '/view/en/newPage?success=true' ) );

			// ASSERT: Correct ZObject was posted to the API.
			expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				summary: '',
				zid: undefined,
				zobject: JSON.stringify( expectedNewFunctionPostedToApi )
			} );
		}, 100 );
	} );
} );
