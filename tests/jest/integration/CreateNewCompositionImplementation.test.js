/*!
 * WikiLambda integration test for creating new composition implementation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

require( '@testing-library/jest-dom' );

const { fireEvent, render, waitFor } = require( '@testing-library/vue' ),
	{ within } = require( '@testing-library/dom' ),
	{ runSetup, runTeardown } = require( './helpers/implementationEditorTestHelpers.js' ),
	{ clickLookupResult } = require( './helpers/interactionHelpers.js' ),
	store = require( '../../../resources/ext.wikilambda.edit/store/index.js' ),
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	expectedNewCompositionImplementationPostedToApi = require( './objects/expectedNewCompositionImplementationPostedToApi.js' );

describe( 'WikiLambda frontend, on zobject-editor view', () => {
	let apiPostWithEditTokenMock;
	beforeEach( () => {
		apiPostWithEditTokenMock = runSetup().apiPostWithEditTokenMock;
	} );

	afterEach( () => {
		runTeardown();
	} );

	it( 'allows creating a new composition implementation', async () => {
		const {
			container,
			findByLabelText,
			findByRole,
			getAllByLabelText,
			getAllByPlaceholderText,
			getByLabelText,
			getByRole,
			getByText
		} = render( App, { global: { plugins: [ store ] } } );

		// ACT: Enter a name for the implementation.
		await fireEvent.update(
			within( await findByLabelText( 'Labels' ) ).getByRole( 'textbox' ),
			'implementation name' );

		// ASSERT: The function specified in URL is pre-selected.
		expect( within( getAllByLabelText( 'function:' )[ 0 ] ).getByRole( 'combobox' ) )
			.toHaveDisplayValue( 'function name, in Chinese' );

		// ASSERT: Composition is pre-selected as implementation type.
		expect( getByRole( 'combobox', { name: 'Composition' } ) ).toBeInTheDocument();

		// ACT: Choose function for composition.
		await fireEvent.update( getAllByPlaceholderText( 'Select a Function' )[ 1 ], 'String eq' );
		await clickLookupResult( container, 'String equality' );

		// ACT: Select Argument Reference for the composition function's first argument.
		await fireEvent.update(
			await waitFor( () => within( getByLabelText( 'first string:' ) )
				.getByRole( 'option', { name: 'Argument Reference' } ) ) );

		// ACT: Select the implemented function's first argument as the referenced argument.
		await fireEvent.update(
			await waitFor( () => within( getByLabelText( 'first string:' ) )
				.getByRole( 'option', { name: 'first argument label, in Afrikaans' } ) ) );

		// ACT: Select Argument Reference for the composition function's second argument.
		await fireEvent.update(
			within( getByLabelText( 'second string:' ) ).getByRole( 'option', { name: 'Argument Reference' } ) );

		// ACT: Select the implemented function's second argument as the referenced argument.
		await fireEvent.update(
			await waitFor( () => within( getByLabelText( 'second string:' ) )
				.getByRole( 'option', { name: 'second argument label, in Afrikaans' } ) ) );

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
			zobject: JSON.stringify( expectedNewCompositionImplementationPostedToApi )
		} );
	} );
} );
