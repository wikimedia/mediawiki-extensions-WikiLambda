/*!
 * WikiLambda integration test for creating new function.
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
	apiGetMock = require( './helpers/apiGetMock.js' ),
	expectedNoLabelFunctionPostedToApi = require( './objects/expectedNoLabelFunctionPostedToApi.js' );

const lookupZObjectTypeLabels =
	new ApiMock( apiGetMock.typeLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const lookupZObjectLanguageLabels =
	new ApiMock( apiGetMock.languageLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );

describe( 'WikiLambda frontend, on function-editor view', () => {
	let apiPostWithEditTokenMock;
	beforeEach( () => {
		const setupResult = runSetup();
		apiPostWithEditTokenMock = setupResult.apiPostWithEditTokenMock;

		mw.Api = jest.fn( () => {
			return {
				postWithEditToken: apiPostWithEditTokenMock,
				get: apiGetMock.createMockApi( [
					lookupZObjectLanguageLabels,
					lookupZObjectTypeLabels,
					initializeRootZObject
				] )
			};
		} );

		window.mw.Uri.mockImplementation( () => {
			return {
				query: {
					title: Constants.PATHS.CREATE_Z_OBJECT_TITLE,
					zid: Constants.Z_FUNCTION
				},
				path: new window.mw.Title( Constants.PATHS.CREATE_Z_OBJECT_TITLE ).getUrl( {
					title: Constants.PATHS.CREATE_Z_OBJECT_TITLE
				} )
			};
		} );

		mw.Title = jest.fn( function ( title ) {
			return {
				getUrl: jest.fn( function () {
					return '/wiki/' + title;
				} )
			};
		} );

		mw.track = jest.fn( function ( trackkey, trackmessage ) {
			// eslint-disable-next-line no-console
			console.log( 'Log emitted: ' + trackkey + ' - ' + trackmessage );
		} );

	} );

	afterEach( () => {
		runTeardown();
	} );

	it( 'handles edge cases during editing/creation, and saves a function with no labels successfully', async () => {
		const { findByLabelText, findByRole, getAllByLabelText, getByLabelText, getByText, queryByRole } =
			render( App, { global: { plugins: [ store ] } } );

		// ACT: Select Chinese as the natural language.
		const languageSelector = await findByLabelText( 'Language' );
		await fireEvent.update( within( languageSelector ).getByRole( 'combobox' ), 'Chin' );
		await clickLookupResult( languageSelector, 'Chinese' );

		// ACT: Select a type for the first argument.
		const argumentsArea = await findByRole( 'inputs-container' );
		await fireEvent.update( within( argumentsArea ).getByPlaceholderText( 'Select a type' ), 'Str' );
		await clickLookupResult( argumentsArea, 'String' );

		// ACT: Delete the just-selected argument [ EDGE CASE ].
		await fireEvent.click( within( argumentsArea ).getByLabelText( 'Remove input' ) );

		// ASSERT: No arguments show.
		expect( within( argumentsArea ).queryByPlaceholderText( 'Select a type' ) ).not.toBeInTheDocument();
		expect( within( argumentsArea ).queryByText( 'String' ) ).not.toBeInTheDocument();

		// ACT: Add an argument.
		await fireEvent.click( getByText( '+ Add an input' ) );

		// ACT: Select a type for the first argument again.
		await fireEvent.update( within( argumentsArea ).getByPlaceholderText( 'Select a type' ), 'Str' );
		await clickLookupResult( argumentsArea, 'String' );

		// ACT: Enter an alias in Chinese.
		const chineseAliasesContainer = getAllByLabelText( 'Alternative names (optional)' )[ 0 ];
		const chineseAliasInput = within( chineseAliasesContainer ).getByRole( 'textbox' );
		await fireEvent.update( chineseAliasInput, 'first function alias, in Chinese' );
		await fireEvent.keyDown( chineseAliasInput, { key: 'enter' } );

		// ACT: Delete the just-entered alias in Chinese [ EDGE CASE ].
		await fireEvent.click( within( chineseAliasesContainer ).getByLabelText( 'Remove item' ) );

		// ACT: Attempt to click publish button,  before output is set (invalid) [ EDGE CASE ].
		await fireEvent.click( getByText( 'Publish' ) );

		// ASSERT: Publish Dialog does not open.
		expect( queryByRole( 'dialog' ) ).not.toBeInTheDocument();

		// ASSERT: The error warning exists on the zobject showing the user they have not set an output type.
		const outputArea = getByLabelText( 'Output' );
		expect( outputArea ).toHaveTextContent( 'A function requires an output' );

		// ACT: Select a type for the output.
		await fireEvent.update( within( outputArea ).getByRole( 'combobox' ), 'Str' );
		await clickLookupResult( outputArea, 'String' );

		// ACT: Add another argument.
		await fireEvent.click( getByText( '+ Add another input' ) );

		// ACT: Select a type for the second argument.
		await fireEvent.update( within( argumentsArea ).getAllByPlaceholderText( 'Select a type' )[ 1 ], 'Str' );
		await clickLookupResult( within( argumentsArea ).getAllByRole( 'listbox', { hidden: true } )[ 1 ], 'String' );

		// [ACT: Don't enter a label for the second argument. [ EDGE CASE ]]

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
			zobject: JSON.stringify( expectedNoLabelFunctionPostedToApi )
		} );
	} );
} );
