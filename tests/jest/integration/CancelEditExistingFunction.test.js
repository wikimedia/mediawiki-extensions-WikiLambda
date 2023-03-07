/*!
 * WikiLambda integration test for cancelling out of the function editor on an existing zobject.
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
	existingFunctionFromApi = require( './objects/existingFunctionFromApi.js' );

const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

const lookupZObjectLanguageLabels =
	new ApiMock( apiGetMock.languageLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );

describe( 'WikiLambda frontend, function-editor view, on a new function', () => {
	let apiPostWithEditTokenMock;
	beforeEach( () => {
		const setupResult = runSetup();
		apiPostWithEditTokenMock = setupResult.apiPostWithEditTokenMock;

		mw.Api = jest.fn( () => {
			return {
				postWithEditToken: apiPostWithEditTokenMock,
				get: apiGetMock.createMockApi( [
					lookupZObjectLanguageLabels,
					initializeRootZObject ] )
			};
		} );

		window.mw.Uri.mockImplementation( () => {
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

	it( 'allows cancelling with no changes', async () => {
		const { findByText } =
			render( App, { global: { plugins: [ store ] } } );

		// ACT: Click cancel button.
		await fireEvent.click( await findByText( 'Cancel' ) );

		// ASSERT: Routed back to the ZObject page.
		await waitFor( () => expect( window.location.href ).toEqual( '/wiki/Z12345' ) );
	} );

	it( 'allows cancelling after changes', async () => {
		const { getByText, findByRole, findByText, getAllByLabelText } =
			render( App, { global: { plugins: [ store ] } } );

		// ACT: Click "Add labels in another language".
		await fireEvent.click( await findByText( 'Add labels in another language' ) );

		// ACT: Select French as a third natural language.
		const thirdLanguageSelector = getAllByLabelText( 'Language' )[ 2 ];
		await fireEvent.update( within( thirdLanguageSelector ).getByRole( 'combobox' ), 'Fren' );
		await clickLookupResult( thirdLanguageSelector, 'French' );

		// ACT: Click cancel button.
		await fireEvent.click( getByText( 'Cancel' ) );

		// ACT: Click continue editing in the dialog.
		await fireEvent.click( within( await findByRole( 'dialog' ) ).getByText( 'Continue editing' ) );

		// ACT: Click cancel button again.
		await fireEvent.click( getByText( 'Cancel' ) );

		// ACT: Click discard edits in the dialog.
		await fireEvent.click( within( await findByRole( 'dialog' ) ).getByText( 'Discard edits' ) );

		// ASSERT: Routed back to the ZObject page.
		await waitFor( () => expect( window.location.href ).toEqual( '/wiki/Z12345' ) );
	} );
} );
