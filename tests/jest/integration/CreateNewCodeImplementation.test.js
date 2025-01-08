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
	{ clickMenuOption } = require( './helpers/interactionHelpers.js' ),
	store = require( '../../../resources/ext.wikilambda.app/store/index.js' ),
	App = require( '../../../resources/ext.wikilambda.app/components/App.vue' ),
	expectedNewCodeImplementationPostedToApi = require( './objects/expectedNewCodeImplementationPostedToApi.js' );

describe( 'WikiLambda frontend, on zobject-editor view', () => {
	let apiPostWithEditTokenMock;
	beforeEach( () => {
		apiPostWithEditTokenMock = runSetup().apiPostWithEditTokenMock;
	} );
	afterEach( () => {
		runTeardown();
	} );

	it( 'should allow you to create a new code implementation', async () => {
		const { getByTestId, findByTestId } = render( App, {
			global: { plugins: [ store ], stubs: {
				teleport: true,
				WlFunctionEvaluatorWidget: true
			} }
		} );

		const zImplementationComponent = await findByTestId( 'z-implementation' );

		// ACT: Select a function
		const zReferenceSelector = await getByTestId( 'z-reference-selector' );
		const zReferenceSelectorDropdown = await within( zReferenceSelector ).getByRole( 'combobox' );

		await fireEvent.select( zReferenceSelectorDropdown, 'Z12345' );

		// ACT: Click code implementation radio
		const implementationRadioContainer = await within( zImplementationComponent ).getByTestId( 'implementation-radio' );

		await fireEvent.click( within( implementationRadioContainer ).getByDisplayValue( 'Z14K3' ) );

		// ASSERT: Check that the code implementation radio button is selected
		expect( within( implementationRadioContainer ).getByDisplayValue( 'Z14K3' ).checked ).toBe( true );

		// ACT: Select programming language
		const programmingLanguageDropdown = await getByTestId( 'language-dropdown' );

		// Click the programming language dropdown
		const programmingLanguageDropdownField = within( programmingLanguageDropdown ).getByRole( 'combobox' );
		await fireEvent.click( programmingLanguageDropdownField );

		// // Select the Javascript option
		const programmingLanguageToSelect = 'javascript';
		await clickMenuOption( programmingLanguageDropdown, programmingLanguageToSelect );

		// ASSERT: Check that the language dropdown has javascript selected
		expect( programmingLanguageDropdownField ).toHaveTextContent( programmingLanguageToSelect );

		// ASSERT: Check that the code editor is visible
		const codeEditor = await getByTestId( 'ace-code-editor' );
		expect( codeEditor ).toBeVisible();

		// ASSERT: Check that the code editor starts with a function definition
		const codeEditorInstance = window.ace.edit( codeEditor );
		expect( codeEditorInstance.getValue() ).toContain( 'function' );

		//* -- Label section
		// ACT: Set the label for the implementation
		const nameField = await findByTestId( 'about-name-field' );
		const nameInput = within( nameField ).getByTestId( 'text-input' );
		fireEvent.update( nameInput, 'implementation name' );
		fireEvent.change( nameInput );

		//* -- Publish section
		// ACT: Publish the implementation
		const publishButton = await getByTestId( 'publish-button' );
		await fireEvent.click( publishButton );

		// ACT: Confirm publish in publish dialog that opens
		const confirmPublishDialog = await getByTestId( 'confirm-publish-dialog' );
		const confirmPublishButton = await within( confirmPublishDialog ).findByText( 'Publish' );

		await fireEvent.click( confirmPublishButton );

		// ASSERT: Location is changed to page returned by API.
		await waitFor( () => expect( window.location.href ).toEqual( '/view/en/newPage?success=true' ) );

		// ASSERT: Correct ZObject was posted to the API.
		// expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith(expect.any);
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith(
			expect.objectContaining( {
				action: expect.any( String ),
				summary: expect.any( String ),
				zid: undefined,
				zobject: JSON.stringify( expectedNewCodeImplementationPostedToApi )
			} )
		);
	} );

} );
