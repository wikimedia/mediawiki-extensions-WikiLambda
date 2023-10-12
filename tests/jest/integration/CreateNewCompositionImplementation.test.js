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

	it( 'should allow you to create a new composition implementation', async () => {
		const { getByTestId, findByTestId, getAllByTestId } = render( App, {
			global: { plugins: [ store ], stubs: {
				teleport: true,
				WlFunctionEvaluatorWidget: true
			} }
		} );

		// ACT: Select a function to add an implementation to
		// const functionToAddImplementationToSelector = await getByTestId( 'z-reference-selector' );
		const functionBlock = await findByTestId( 'implementation-function' );
		const zReferenceSelectorDropdown = await within( functionBlock ).getByRole( 'combobox' );

		await fireEvent.select( zReferenceSelectorDropdown, 'Z12345' );

		// ACT: Click code implementation radio
		const implementationRadioContainer = await findByTestId( 'implementation-radio' );

		await fireEvent.click( within( implementationRadioContainer ).getByDisplayValue( 'Z14K2' ) );

		// ASSERT: Check that the code implementation radio button is selected
		expect( within( implementationRadioContainer ).getByDisplayValue( 'Z14K2' ).checked ).toBe( true );

		// ACT: Click select function link button
		const implementationContentBlock = await findByTestId( 'implementation-content-block' );

		const selectFunctionLinkContainer = await within( implementationContentBlock ).findByTestId( 'z-object-to-string' );
		const selectFunctionLink = selectFunctionLinkContainer.getElementsByTagName( 'a' )[ 0 ];

		await fireEvent.click( selectFunctionLink );

		// ACT: Select the function to use for the composition implementation
		const compositionReferenceSelectorContainer = within( implementationContentBlock ).getByTestId( 'z-reference-selector' );
		const compositionReferenceSelector = await within( compositionReferenceSelectorContainer ).getByRole( 'combobox' );

		const functionNameToSelect = 'String equality';

		await fireEvent.update( compositionReferenceSelector, functionNameToSelect );
		await clickLookupResult( compositionReferenceSelectorContainer, functionNameToSelect );

		// ASSERT: Check that the correct function is selected
		expect( compositionReferenceSelector.value ).toBe( functionNameToSelect );

		// ASSERT: Check that we have 2 arguments available after selecting "String equality"
		expect( getAllByTestId( 'text-input' ).length ).toBe( 2 );

		// ACT: Change the type of the first argument to argument reference
		// By fetching this like this, we are guaranteed of only what is in the composition content block section - other page layout elements may change without affecting this
		const compositionZObjectKeyValueSet = await within( implementationContentBlock ).getByTestId( 'z-object-key-value-set' );
		const compositionAccordionList = await within( compositionZObjectKeyValueSet ).getAllByTestId( 'z-object-key-value' );

		//* -- First argument
		// The first argument is the third accordion in the list (the first is the composition type and the second is the composition function)
		const firstArgumentAccordion = compositionAccordionList[ 2 ];
		const firstArgumentAccordionToggleButton = await within( firstArgumentAccordion ).getByTestId( 'expanded-toggle' );
		await fireEvent.click( firstArgumentAccordionToggleButton );
		const compositionArg1TypeSelectorContainer = await within( firstArgumentAccordion ).getByTestId( 'z-object-type-select' );

		// ACT: Set argument type for first argument ("First string") to argument reference
		await clickLookupResult( compositionArg1TypeSelectorContainer, 'Argument reference' );

		// ASSERT: Check that the type of the first argument is now argument reference
		expect( within( firstArgumentAccordion ).getAllByRole( 'combobox' )[ 0 ] ).toHaveTextContent( 'Argument reference' );

		// ACT: Select the first argument
		const firstArgumentInput = within( firstArgumentAccordion ).getByTestId( 'argument-reference-key' );
		const firstArgumentExpectedInput = 'first argument label, in Afrikaans';
		await clickLookupResult( firstArgumentInput, firstArgumentExpectedInput );

		// ASSERT: Check the value of the first argument is correctly set
		expect( within( firstArgumentInput ).getByRole( 'combobox' ) ).toHaveTextContent( firstArgumentExpectedInput );

		//* -- Second argument
		// The second argument is the fourth accordion in the list (the first is the composition type and the second is the composition function)
		const secondArgumentAccordion = compositionAccordionList[ 3 ];
		const secondArgumentAccordionToggleButton = await within( secondArgumentAccordion ).getByTestId( 'expanded-toggle' );
		await fireEvent.click( secondArgumentAccordionToggleButton );
		const compositionArg2TypeSelectorContainer = await within( secondArgumentAccordion ).getByTestId( 'z-object-type-select' );

		// ACT: Set argument type for first argument ("Second string") to argument reference
		await clickLookupResult( compositionArg2TypeSelectorContainer, 'Argument reference' );

		// ASSERT: Check that the type of the first argument is now argument reference
		expect( within( secondArgumentAccordion ).getAllByRole( 'combobox' )[ 0 ] ).toHaveTextContent( 'Argument reference' );

		// ACT: Select the second argument
		const secondArgumentInput = within( secondArgumentAccordion ).getByTestId( 'argument-reference-key' );
		const secondArgumentExpectedInput = 'second argument label, in Afrikaans';
		await clickLookupResult( secondArgumentInput, secondArgumentExpectedInput );

		// ASSERT: Check the value of the first argument is correctly set
		expect( within( secondArgumentInput ).getByRole( 'combobox' ) ).toHaveTextContent( secondArgumentExpectedInput );

		//* -- Label section
		// ACT: Set the label for the code implementation
		const openLanguageDialogButton = await getByTestId( 'open-language-dialog-button' );
		await fireEvent.click( openLanguageDialogButton );

		const languageDialog = await getByTestId( 'edit-label-dialog' );
		const languageDialogInputs = within( languageDialog ).getAllByTestId( 'text-input' );
		const languageDialogEditLabelInput = languageDialogInputs[ 0 ];

		fireEvent.update( languageDialogEditLabelInput, 'implementation name' );

		// Since the button does not have a role and is built into the codex dialog component, we need to use getByText
		const confirmEditLabelButton = within( languageDialog ).getByText( 'Done' );
		fireEvent.click( confirmEditLabelButton );

		//* -- Publish section
		// ACT: Publish the implementation
		const publishButton = await getByTestId( 'publish-button' );
		await fireEvent.click( publishButton );

		// ACT: Confirm publish in publish dialog that opens
		const confirmPublishDialog = await getByTestId( 'confirm-publish-dialog' );
		const confirmPublishButton = await within( confirmPublishDialog ).getByText( 'Publish' );

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
			} )
		);
	}, 50000 );
} );
