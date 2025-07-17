/*!
 * WikiLambda integration test for creating new composition implementation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

require( '@testing-library/jest-dom' );

const { fireEvent, render, waitFor } = require( '@testing-library/vue' );
const { within } = require( '@testing-library/dom' );
const App = require( '../../../resources/ext.wikilambda.app/components/App.vue' );
const expectedNewCompositionImplementationPostedToApi = require( './objects/expectedNewCompositionImplementationPostedToApi.js' );
const { runSetup, runTeardown } = require( './helpers/implementationEditorTestHelpers.js' );
const { lookupSearchAndSelect, clickMenuOption } = require( './helpers/interactionHelpers.js' );

describe( 'WikiLambda frontend, on zobject-editor view', () => {
	let apiPostWithEditTokenMock;
	beforeEach( () => {
		apiPostWithEditTokenMock = runSetup().apiPostWithEditTokenMock;
	} );

	afterEach( () => {
		runTeardown();
	} );

	it( 'should allow you to create a new composition implementation', async () => {
		const { container, getByTestId, findByTestId } = render( App, {
			global: { stubs: {
				teleport: true,
				WlFunctionEvaluatorWidget: true
			} }
		} );

		// Wait for loading to finish (max 5 seconds)
		await waitFor( () => expect( container ).not.toHaveTextContent( 'Loading data' ), { timeout: 5000 } );

		// ACT: Select a function to add an implementation to
		const functionBlock = await findByTestId( 'implementation-function' );
		const zReferenceSelectorDropdown = await within( functionBlock ).getByRole( 'combobox' );

		await fireEvent.select( zReferenceSelectorDropdown, 'Z12345' );

		// ACT: Click code implementation radio
		const implementationRadioContainer = await findByTestId( 'implementation-radio' );

		await fireEvent.click( within( implementationRadioContainer ).getByDisplayValue( 'Z14K2' ) );

		// ASSERT: Check that the composition implementation radio button is selected
		expect( within( implementationRadioContainer ).getByDisplayValue( 'Z14K2' ).checked ).toBe( true );

		//* -- Implementation content
		// ACT: Click select function link button
		const implementationContentBlock = await findByTestId( 'implementation-content-block' );

		const selectFunctionLinkContainer = await within( implementationContentBlock ).findByTestId( 'z-object-to-string' );
		const selectFunctionLink = selectFunctionLinkContainer.getElementsByTagName( 'a' )[ 0 ];

		await fireEvent.click( selectFunctionLink );

		// ACT: Select the function to use for the composition implementation
		const compositionReferenceSelectorContainer = within( implementationContentBlock ).getAllByTestId( 'z-reference-selector' )[ 1 ];
		const functionNameToSelect = 'String equality';
		await lookupSearchAndSelect( compositionReferenceSelectorContainer, 'equality', functionNameToSelect );

		// ASSERT: Check that the correct function is selected
		const compositionReferenceSelector = await within( compositionReferenceSelectorContainer ).findByRole( 'combobox' );
		expect( compositionReferenceSelector.value ).toBe( functionNameToSelect );

		// ASSERT: Check that we have 2 arguments available after selecting "String equality"
		expect( within( implementationContentBlock ).getAllByTestId( 'text-input' ).length ).toBe( 2 );

		// ACT: Change the type of the first argument to argument reference
		// By fetching this like this, we are guaranteed of only what is in the composition content block section - other page layout elements may change without affecting this
		const compositionZObjectKeyValueSet = await within( implementationContentBlock ).getByTestId( 'z-object-key-value-set' );
		const compositionKeyValueList = await within( compositionZObjectKeyValueSet ).getAllByTestId( 'z-object-key-value' );

		//* -- First argument
		// The first argument is the third accordion in the list (the first is the composition type and the second is the composition function)
		const firstArgument = compositionKeyValueList[ 2 ];

		// ACT: Set argument type for first argument ("First string") to argument reference
		const firstArgumentModeSelector = await within( firstArgument ).getByTestId( 'mode-selector-button' );
		await fireEvent.click( firstArgumentModeSelector );
		await clickMenuOption( firstArgument, 'Argument reference' );

		// ASSERT: Check that the type of the first argument is now argument reference
		const firstArgumentTypeSelector = within( firstArgument ).getAllByRole( 'combobox' )[ 0 ];
		expect( firstArgumentTypeSelector.value ).toBe( 'Argument reference' );

		// ACT: Select the first argument
		const firstArgumentInput = within( firstArgument ).getByTestId( 'z-argument-reference' );
		const firstArgumentExpectedInput = 'first argument label, in Afrikaans';
		await clickMenuOption( firstArgumentInput, firstArgumentExpectedInput );

		// ASSERT: Check the value of the first argument is correctly set
		expect( within( firstArgumentInput ).getByRole( 'combobox' ) ).toHaveTextContent( firstArgumentExpectedInput );

		//* -- Second argument
		// The second argument is the fourth accordion in the list (the first is the composition type and the second is the composition function)
		const secondArgument = compositionKeyValueList[ 3 ];

		// ACT: Set argument type for second argument ("Second string") to argument reference
		const secondArgumentModeSelector = await within( secondArgument ).getByTestId( 'mode-selector-button' );
		await fireEvent.click( secondArgumentModeSelector );
		await clickMenuOption( secondArgument, 'Argument reference' );

		// ASSERT: Check that the type of the second argument is now argument reference
		const secondArgumentTypeSelector = within( secondArgument ).getAllByRole( 'combobox' )[ 0 ];
		expect( secondArgumentTypeSelector.value ).toBe( 'Argument reference' );

		// ACT: Select the second argument
		const secondArgumentInput = within( secondArgument ).getByTestId( 'z-argument-reference' );
		const secondArgumentExpectedInput = 'second argument label, in Afrikaans';
		await clickMenuOption( secondArgumentInput, secondArgumentExpectedInput );

		// ASSERT: Check the value of the second argument is correctly set
		expect( within( secondArgumentInput ).getByRole( 'combobox' ) ).toHaveTextContent( secondArgumentExpectedInput );

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
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith(
			expect.objectContaining( {
				action: expect.any( String ),
				summary: expect.any( String ),
				zid: undefined,
				zobject: JSON.stringify( expectedNewCompositionImplementationPostedToApi )
			} ), { signal: undefined }
		);
	} );
} );
