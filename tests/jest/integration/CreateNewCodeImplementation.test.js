/*!
 * WikiLambda integration test for creating new code implementation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

require( '@testing-library/jest-dom' );

const { fireEvent, render, waitFor } = require( '@testing-library/vue' ),
	{ within } = require( '@testing-library/dom' ),
	{ runSetup, runTeardown } = require( './helpers/implementationEditorTestHelpers.js' ),
	store = require( '../../../resources/ext.wikilambda.edit/store/index.js' ),
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	expectedNewCodeImplementationPostedToApi = require( './objects/expectedNewCodeImplementationPostedToApi.js' );

describe( 'WikiLambda frontend, on zobject-editor view', () => {
	let apiPostWithEditTokenMock;
	beforeEach( () => {
		apiPostWithEditTokenMock = runSetup().apiPostWithEditTokenMock;
	} );

	afterEach( () => {
		runTeardown();
	} );

	// TODO (T336997): Adapt to DefaultView
	it.skip( 'allows creating a new code implementation', async () => {
		const { findByLabelText, findByRole, getAllByLabelText, getByText } =
			render( App, { global: { plugins: [ store ] } } );

		// ACT: Enter a name for the implementation.
		await fireEvent.update(
			within( await findByLabelText( 'Labels' ) ).getByRole( 'textbox' ),
			'implementation name' );

		// ASSERT: The function specified in URL is pre-selected.
		expect( within( getAllByLabelText( 'function:' )[ 0 ] ).getByRole( 'combobox' ) )
			.toHaveDisplayValue( 'function name, in Chinese' );

		// ACT: Choose Code as implementation type.
		await fireEvent.click( getByText( 'Code' ) );

		// ACT: Select JavaScript as programming language.
		await fireEvent.click( getByText( 'javascript' ) );

		// ACT: Edit the code.
		await fireEvent.update(
			within( await findByLabelText( 'Code editor' ) ).getByRole( 'textbox' ),
			' // TODO: actually implement' );

		// ACT: Click publish button.
		await fireEvent.click( getByText( 'Publish' ) );

		// ACT: Click publish button in dialog.
		await fireEvent.click( within( await findByRole( 'dialog' ) ).getByText( 'Publish' ) );

		// ASSERT: Location is changed to page returned by API.
		await waitFor( () => expect( window.location.href ).toEqual( '/wiki/newPage?success=true' ) );

		// ASSERT: Correct ZObject was posted to the API.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			summary: '',
			zid: undefined,
			zobject: JSON.stringify( expectedNewCodeImplementationPostedToApi )
		} );
	} );
} );
