/*!
 * WikiLambda integration test for creating a Wikidata enum.
 *
 * @copyright 2024– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { fireEvent, render, waitFor } = require( '@testing-library/vue' );
const { within } = require( '@testing-library/dom' );
require( '@testing-library/jest-dom' );

const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const App = require( '../../../resources/ext.wikilambda.app/components/App.vue' );
const { lookupSearchAndSelect, clickMenuOption } = require( './helpers/interactionHelpers.js' );
const { runSetup, runTeardown } = require( './helpers/defaultViewTestHelpers.js' );
const { wikidataEnumZObject } = require( './objects/expectedNewWikidataEnumPostedToApi.js' );

describe( 'WikiLambda frontend, create Wikidata enum', () => {
	let apiPostWithEditTokenMock;
	beforeEach( () => {
		const pageConfig = {
			createNewPage: true,
			title: Constants.PATHS.CREATE_OBJECT_TITLE,
			queryParams: {
				zid: ''
			}
		};
		const setupResult = runSetup( pageConfig );
		apiPostWithEditTokenMock = setupResult.apiPostWithEditTokenMock;
	} );

	afterEach( () => {
		runTeardown();
	} );

	it( 'successfully creates a new Wikidata enum with lexemes', async () => {
		const { getByText, findByTestId, findByRole } = render( App, {
			global: { stubs: { teleport: true } }
		} );

		// All actions and queries are scoped within the content area
		const content = await findByTestId( 'content' );

		// EXPECT: On load a label 'type' and a zobjectselector lookup is in view
		const typeLabel = within( content ).queryAllByTestId( 'localized-label' )[ 0 ];
		const referenceSelector = within( typeLabel.parentElement.parentElement ).getByTestId( 'z-reference-selector' );
		expect( typeLabel ).toHaveTextContent( 'type' );
		expect( referenceSelector ).toBeInTheDocument();

		// ACT: In zobjectselector lookup type and select 'function call'
		await lookupSearchAndSelect( referenceSelector, 'Function call', 'Function call' );

		// EXPECT: a field appears with label 'function' and a zobjectselector lookup
		const functionLabel = within( content ).queryAllByTestId( 'localized-label' )[ 1 ];
		const functionSelector = within( functionLabel.parentElement.parentElement ).getByTestId( 'z-reference-selector' );
		expect( functionLabel ).toHaveTextContent( 'function' );
		expect( functionSelector ).toBeInTheDocument();

		// ACT: type and select in the zobjectselector lookup field of 'function': 'Typed enum of Wikidata references'
		await lookupSearchAndSelect( functionSelector, 'Typed enum', 'Typed enum of Wikidata references' );

		// EXPECT: a field appears with label 'Wikidata reference type' and a selectbox
		const wikidataTypeLabel = within( content ).queryAllByTestId( 'localized-label' )[ 2 ];
		const wikidataTypeSelect = within( wikidataTypeLabel.parentElement.parentElement ).getByTestId( 'z-wikidata-enum-type-select' );
		expect( wikidataTypeLabel ).toHaveTextContent( 'Wikidata reference type' );
		expect( wikidataTypeSelect ).toBeInTheDocument();

		// EXPECT: also a typed list field appears with label 'list of Wikidata references' and a plus icon button
		const typedListLabel = within( content ).queryAllByTestId( 'localized-label' )[ 3 ];
		const typedListItems = within( content ).getByTestId( 'z-typed-list-items' );
		const addItemButton = within( typedListLabel.parentElement.parentElement ).getByTestId( 'typed-list-add-item' );
		expect( typedListLabel ).toHaveTextContent( 'list of Wikidata references' );
		expect( typedListItems ).toBeInTheDocument();
		expect( addItemButton ).toBeInTheDocument();

		// ACT: Select in the select box: 'Wikidata lexeme reference'
		await fireEvent.click( wikidataTypeSelect );
		await clickMenuOption( wikidataTypeSelect.parentElement, 'Wikidata lexeme reference' );

		// ACT: Click on the plus button to add a new item in the list
		await fireEvent.click( addItemButton );

		// EXPECT: a label appears 'item 1' together with a wikidata lexeme selector
		const typedListItemElements1 = within( typedListItems ).getAllByTestId( 'z-object-key-value' );
		const item1Label = within( typedListItems ).queryAllByTestId( 'localized-label' )[ 0 ];
		const lexemeSelector1 = within( item1Label.parentElement.parentElement ).getByTestId( 'wikidata-lexeme' );
		const lexemeInput1 = within( item1Label.parentElement.parentElement ).getByTestId( 'wikidata-entity-selector' );
		expect( typedListItemElements1.length ).toEqual( 1 );
		expect( item1Label ).toHaveTextContent( 'Item $1' );
		expect( lexemeSelector1 ).toBeInTheDocument();

		// ACT: Add 1 item to the list: masculine
		await lookupSearchAndSelect( lexemeSelector1, 'masculine', 'masculine 1' );

		// EXPECT: the input field of the 1st item is set to 'masculine'
		expect( lexemeInput1 ).toHaveValue( 'masculine 1' );

		// ACT: Click on the plus button to add a new item in the list
		await fireEvent.click( addItemButton );

		// EXPECT: a label appears 'item 2' together with a wikidata lexeme selector
		const typedListItemElements2 = within( typedListItems ).getAllByTestId( 'z-object-key-value' );
		const item2Label = within( typedListItems ).queryAllByTestId( 'localized-label' )[ 1 ];
		const lexemeSelector2 = within( item2Label.parentElement.parentElement ).getByTestId( 'wikidata-lexeme' );
		const lexemeInput2 = within( item2Label.parentElement.parentElement ).getByTestId( 'wikidata-entity-selector' );
		expect( typedListItemElements2.length ).toEqual( 2 );
		expect( item2Label ).toHaveTextContent( 'Item $1' );
		expect( lexemeSelector2 ).toBeInTheDocument();

		// ACT: Add 2nd item to the list: feminine
		await lookupSearchAndSelect( lexemeSelector2, 'feminine', 'feminine 2' );

		// EXPECT: the input field of the 2nd item is set to 'feminine'
		expect( lexemeInput2 ).toHaveValue( 'feminine 2' );

		// ACT: Click publish button.
		await fireEvent.click( getByText( 'Publish' ) );

		// ACT: Add a summary of your changes.
		const publishDialog = await findByRole( 'dialog' );
		await fireEvent.update(
			within( publishDialog ).getByLabelText( 'How did you improve this page?' ),
			'my changes summary' );

		// ACT: Click publish button in dialog.
		await fireEvent.click( within( publishDialog ).getByText( 'Publish' ) );

		// ASSERT: Location is changed to page returned by API.
		await waitFor( () => expect( window.location.href ).toEqual( '/view/en/newPage?success=true' ) );

		// ASSERT: Correct ZObject was posted to the API.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			uselang: 'en',
			summary: 'my changes summary',
			zid: undefined,
			zobject: JSON.stringify( wikidataEnumZObject( Constants.Z_WIKIDATA_REFERENCE_LEXEME, [ 'L111111', 'L222222' ] ) )
		} );
	} );

	it( 'swaps the Wikidata type and removes incompatible list items', async () => {
		const { getByText, findByTestId, findByRole } = render( App, {
			global: { stubs: { teleport: true } }
		} );

		// All actions and queries are scoped within the content area
		const content = await findByTestId( 'content' );

		// EXPECT: On load a label 'type' and a zobjectselector lookup is in view
		const typeLabel = within( content ).queryAllByTestId( 'localized-label' )[ 0 ];
		const referenceSelector = within( typeLabel.parentElement.parentElement ).getByTestId( 'z-reference-selector' );
		expect( typeLabel ).toHaveTextContent( 'type' );
		expect( referenceSelector ).toBeInTheDocument();

		// ACT: In zobjectselector lookup type and select 'function call'
		await lookupSearchAndSelect( referenceSelector, 'Function call', 'Function call' );

		// EXPECT: a field appears with label 'function' and a zobjectselector lookup
		const functionLabel = within( content ).queryAllByTestId( 'localized-label' )[ 1 ];
		const functionSelector = within( functionLabel.parentElement.parentElement ).getByTestId( 'z-reference-selector' );
		expect( functionLabel ).toHaveTextContent( 'function' );
		expect( functionSelector ).toBeInTheDocument();

		// ACT: type and select in the zobjectselector lookup field of 'function': 'Typed enum of Wikidata references'
		await lookupSearchAndSelect( functionSelector, 'Typed enum', 'Typed enum of Wikidata references' );

		// EXPECT: a field appears with label 'Wikidata reference type' and a selectbox
		const wikidataTypeLabel = within( content ).queryAllByTestId( 'localized-label' )[ 2 ];
		const wikidataTypeSelect = within( wikidataTypeLabel.parentElement.parentElement ).getByTestId( 'z-wikidata-enum-type-select' );
		expect( wikidataTypeLabel ).toHaveTextContent( 'Wikidata reference type' );
		expect( wikidataTypeSelect ).toBeInTheDocument();

		// EXPECT: also a typed list field appears with label 'list of Wikidata references' and a plus icon button
		const typedListLabel = within( content ).queryAllByTestId( 'localized-label' )[ 3 ];
		const typedListItems = within( content ).getByTestId( 'z-typed-list-items' );
		const addItemButton = within( typedListLabel.parentElement.parentElement ).getByTestId( 'typed-list-add-item' );
		expect( typedListLabel ).toHaveTextContent( 'list of Wikidata references' );
		expect( typedListItems ).toBeInTheDocument();
		expect( addItemButton ).toBeInTheDocument();

		// ACT: Select in the select box: 'Wikidata lexeme reference'
		await fireEvent.click( wikidataTypeSelect );
		await clickMenuOption( wikidataTypeSelect.parentElement, 'Wikidata lexeme reference' );

		// ACT: Click on the plus button to add a new item in the list
		await fireEvent.click( addItemButton );

		// EXPECT: a label appears 'item 1' together with a wikidata lexeme selector
		const typedListItemElements1 = within( typedListItems ).getAllByTestId( 'z-object-key-value' );
		const item1Label = within( typedListItems ).queryAllByTestId( 'localized-label' )[ 0 ];
		const lexemeSelector1 = within( item1Label.parentElement.parentElement ).getByTestId( 'wikidata-lexeme' );
		const lexemeInput1 = within( item1Label.parentElement.parentElement ).getByTestId( 'wikidata-entity-selector' );
		expect( typedListItemElements1.length ).toEqual( 1 );
		expect( item1Label ).toHaveTextContent( 'Item $1' );
		expect( lexemeSelector1 ).toBeInTheDocument();

		// ACT: Add 1 item to the list: masculine
		await lookupSearchAndSelect( lexemeSelector1, 'masculine', 'masculine 1' );

		// EXPECT: the input field of the 1st item is set to 'masculine'
		expect( lexemeInput1 ).toHaveValue( 'masculine 1' );

		// ACT: Swap the type by selecting in the select box: 'Wikidata item reference'
		await fireEvent.click( wikidataTypeSelect );
		await clickMenuOption( wikidataTypeSelect.parentElement, 'Wikidata item reference' );

		// ACT: Click on the plus button to add a new item in the list
		await fireEvent.click( addItemButton );

		// EXPECT: a label appears 'item 2' together with a wikidata item selector
		const typedListItemElements2 = within( typedListItems ).getAllByTestId( 'z-object-key-value' );
		const item2Label = within( typedListItems ).queryAllByTestId( 'localized-label' )[ 1 ];
		const itemSelector = within( item2Label.parentElement.parentElement ).getByTestId( 'wikidata-item' );
		const itemInput = within( item2Label.parentElement.parentElement ).getByTestId( 'wikidata-entity-selector' );
		expect( typedListItemElements2.length ).toEqual( 2 );
		expect( item2Label ).toHaveTextContent( 'Item $1' );
		expect( itemSelector ).toBeInTheDocument();

		// ACT: Add 2nd item to the list: feminine
		await lookupSearchAndSelect( itemSelector, 'feminine', 'feminine 1' );

		// EXPECT: the input field of the 1st item is set to 'feminine'
		expect( itemInput ).toHaveValue( 'feminine 1' );

		// ACT: Click publish button.
		await fireEvent.click( getByText( 'Publish' ) );

		// ACT: Add a summary of your changes.
		const publishDialog = await findByRole( 'dialog' );
		await fireEvent.update(
			within( publishDialog ).getByLabelText( 'How did you improve this page?' ),
			'my changes summary' );

		// ACT: Click publish button in dialog.
		await fireEvent.click( within( publishDialog ).getByText( 'Publish' ) );

		// ASSERT: Location is changed to page returned by API.
		await waitFor( () => expect( window.location.href ).toEqual( '/view/en/newPage?success=true' ) );

		// ASSERT: Correct ZObject was posted to the API.
		await waitFor( () => expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			uselang: 'en',
			summary: 'my changes summary',
			zid: undefined,
			zobject: JSON.stringify( wikidataEnumZObject( Constants.Z_WIKIDATA_REFERENCE_ITEM, [ 'Q111111' ] ) )
		} ) );
	} );
} );
