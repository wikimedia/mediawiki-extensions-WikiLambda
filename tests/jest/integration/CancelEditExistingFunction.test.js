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
	{ lookupSearchAndSelect, textInputChange } = require( './helpers/interactionHelpers.js' ),
	{ runSetup, runTeardown } = require( './helpers/functionEditorTestHelpers.js' ),
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	store = require( '../../../resources/ext.wikilambda.edit/store/index.js' ),
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	existingFunctionFromApi = require( './objects/existingFunctionFromApi.js' );

const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

describe( 'WikiLambda frontend, function-editor view, on a new function', () => {
	beforeEach( () => {
		const pageConfig = {
			createNewPage: false,
			title: functionZid,
			queryParams: {
				action: Constants.ACTIONS.EDIT,
				title: functionZid
			}
		};
		runSetup( pageConfig );
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
		await waitFor( () => expect( window.location.href ).toEqual( '/view/en/Z12345' ) );
	} );

	it( 'allows cancelling after changes', async () => {
		const { getByText, findByRole, findByText, getAllByTestId } =
			render( App, { global: { plugins: [ store ] } } );

		// ACT: Click "Add labels in another language".
		await fireEvent.click( await findByText( 'Add labels in another language' ) );

		// ACT: Select French as a third natural language.
		const thirdLanguageSelector = getAllByTestId( 'function-editor-language-selector' )[ 2 ];
		await lookupSearchAndSelect( thirdLanguageSelector, 'Fren', 'French' );

		// ACT: Add new label in French
		const thirdNameInput = getAllByTestId( 'function-editor-name-input' )[ 2 ];
		await textInputChange( thirdNameInput, 'New name, in French' );

		// ACT: Click cancel button.
		await fireEvent.click( getByText( 'Cancel' ) );

		// ACT: Click continue editing in the dialog.
		await fireEvent.click( within( await findByRole( 'dialog' ) ).getByText( 'Continue editing' ) );

		// ACT: Click cancel button again.
		await fireEvent.click( getByText( 'Cancel' ) );

		// ACT: Click discard edits in the dialog.
		await fireEvent.click( within( await findByRole( 'dialog' ) ).getByText( 'Discard edits' ) );

		// ASSERT: Routed back to the ZObject page.
		await waitFor( () => expect( window.location.href ).toEqual( '/view/en/Z12345' ) );
	} );
} );
