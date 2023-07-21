/*!
 * WikiLambda integration test for cancelling out of the function editor on a new zobject.
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
	apiGetMock = require( './helpers/apiGetMock.js' );

const lookupZObjectLanguageLabels =
	new ApiMock( apiGetMock.languageLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );

describe( 'WikiLambda frontend, function-editor view, on a new function', () => {
	beforeEach( () => {
		runSetup();
		mw.Api = jest.fn( () => {
			return {
				get: apiGetMock.createMockApi( [
					lookupZObjectLanguageLabels,
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

	it( 'allows cancelling with no changes', async () => {
		const { findByText } =
			render( App, { global: { plugins: [ store ] } } );

		// ACT: Click cancel button.
		await fireEvent.click( await findByText( 'Cancel' ) );

		// ASSERT: Routed back to the Wikifunctions main page.
		await waitFor( () => expect( window.location.href ).toEqual( '/wiki/Wikifunctions:Main_Page' ) );
	} );

	it( 'allows cancelling after changes', async () => {
		const { getByText, findByRole, findByLabelText } =
			render( App, { global: { plugins: [ store ] } } );

		// ACT: Select Chinese as the natural language.
		const languageSelector = await findByLabelText( 'Language' );
		await fireEvent.update( within( languageSelector ).getByRole( 'combobox' ), 'Chin' );
		await clickLookupResult( languageSelector, 'Chinese' );

		// ACT: Click cancel button.
		await fireEvent.click( getByText( 'Cancel' ) );

		// ACT: Click continue editing in the dialog.
		await fireEvent.click( within( await findByRole( 'dialog' ) ).getByText( 'Continue editing' ) );

		// ACT: Click cancel button again.
		await fireEvent.click( getByText( 'Cancel' ) );

		// ACT: Click discard edits in the dialog.
		await fireEvent.click( within( await findByRole( 'dialog' ) ).getByText( 'Discard edits' ) );

		// ASSERT: Routed back to the Wikifunctions main page.
		await waitFor( () => expect( window.location.href ).toEqual( '/wiki/Wikifunctions:Main_Page' ) );
	} );
} );
