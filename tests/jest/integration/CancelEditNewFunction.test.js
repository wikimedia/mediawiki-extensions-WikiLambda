/*!
 * WikiLambda integration test for cancelling out of the function editor on a new zobject.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

require( '@testing-library/jest-dom' );

const { fireEvent, render, waitFor } = require( '@testing-library/vue' );
const { within } = require( '@testing-library/dom' );
const App = require( '../../../resources/ext.wikilambda.app/components/App.vue' );
const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const { runSetup, runTeardown } = require( './helpers/functionEditorTestHelpers.js' );
const { textInputChange } = require( './helpers/interactionHelpers.js' );

describe( 'WikiLambda frontend, function-editor view, on a new function', () => {

	beforeEach( () => {
		const pageConfig = {
			createNewPage: true,
			title: Constants.PATHS.CREATE_OBJECT_TITLE,
			queryParams: {
				zid: Constants.Z_FUNCTION
			}
		};
		runSetup( pageConfig );
	} );

	afterEach( () => {
		runTeardown();
	} );

	it( 'allows cancelling with no changes', async () => {
		const { findByText } =
			render( App );

		// ACT: Click cancel button.
		await fireEvent.click( await findByText( 'Cancel' ) );

		// ASSERT: Routed back to the Wikifunctions main page.
		await waitFor( () => expect( window.location.href ).toEqual( '/wiki/Wikifunctions:Main_Page' ) );
	} );

	it( 'allows cancelling after changes', async () => {
		const {
			findByRole,
			findByTestId,
			getByText
		} = render( App );

		// ACT: Change first language name
		const nameInput = await findByTestId( 'function-editor-name-input' );
		await textInputChange( nameInput, 'Edited name' );

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
