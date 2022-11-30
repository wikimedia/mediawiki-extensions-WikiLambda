/* eslint-disable compat/compat */
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
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	store = require( '../../../resources/ext.wikilambda.edit/store/index.js' ),
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	ApiMock = require( './helpers/apiMock.js' ),
	apiGetMock = require( './helpers/apiGetMock.js' ),
	expectedNewFunctionPostedToApi = require( './objects/expectedNewFunctionPostedToApi.js' );

const lookupZObjectTypeLabels =
	new ApiMock( apiGetMock.typeLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const lookupZObjectLanguageLabels =
	new ApiMock( apiGetMock.languageLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );

describe( 'WikiLambda frontend, on function-editor view', () => {
	let apiPostWithEditTokenMock;
	beforeEach( () => {
		// Needed because of the Teleported component.
		const el = document.createElement( 'div' );
		el.id = 'ext-wikilambda-app';
		document.body.appendChild( el );

		jest.useFakeTimers();

		global.window = Object.create( window );
		Object.defineProperty( window, 'location', {
			value: {
				href: 'currentPage'
			}
		} );

		// This is necessary to allow FunctionDefinition to attempt to scroll to second language without crashing.
		document.getElementById = ( selector ) => {
			if ( selector === 'fnDefinitionContainer' ) {
				return {};
			}
		};

		apiPostWithEditTokenMock = jest.fn( () => Promise.resolve( {
			wikilambda_edit: {
				page: 'newPage'
			}
		} ) );
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
				path: Constants.PATHS.CREATE_Z_OBJECT,
				query: {
					view: Constants.VIEWS.FUNCTION_EDITOR
				}
			};
		} );

		mw.Title = jest.fn( function ( title ) {
			return {
				getUrl: jest.fn( function () {
					return '/wiki/' + title;
				} )
			};
		} );
	} );

	afterEach( () => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	} );

	// TODO(T323764): This test is currently extremely long. Consider moving some of the less-used functionality (e.g.
	// trying to publish a function without an output type) into separate test cases.
	it( 'allows creating a new function, making use of most important features', async () => {
		const { findByLabelText, findByRole, getAllByLabelText, getByLabelText, getByText, queryByRole } =
			render( App, { global: { plugins: [ store ] } } );

		// ACT: Select Chinese as the natural language.
		const languageSelector = await findByLabelText( 'Language' );
		await fireEvent.update( within( languageSelector ).getByRole( 'combobox' ), 'Chin' );
		await clickLookupResult( languageSelector, 'Chinese' );

		// ACT: Enter a name for the function in Chinese.
		await fireEvent.update( getByLabelText( 'Name (optional)' ), 'function name, in Chinese' );

		// ACT: Enter an alias for the function in Chinese.
		const aliasInput = within( getByLabelText( 'Aliases (optional)' ) ).getByRole( 'textbox' );
		await fireEvent.update( aliasInput, 'function alias, in Chinese' );
		await fireEvent.keyDown( aliasInput, { key: 'enter' } );

		// ACT: Select a type for the first argument.
		const argumentsArea = getByLabelText( 'Input type' );
		await fireEvent.update( within( argumentsArea ).getByPlaceholderText( 'Select a type' ), 'Str' );
		await clickLookupResult( argumentsArea, 'String' );

		// ACT: Delete the just-selected argument.
		await fireEvent.click( within( argumentsArea ).getByLabelText( 'Remove input' ) );

		// ASSERT: No arguments show.
		expect( within( argumentsArea ).queryByPlaceholderText( 'Select a type' ) ).not.toBeInTheDocument();
		expect( within( argumentsArea ).queryByText( 'String' ) ).not.toBeInTheDocument();

		// ACT: Add an argument.
		await fireEvent.click( getByText( '+ Add an input' ) );

		// ACT: Select a type for the first argument again.
		await fireEvent.update( within( argumentsArea ).getByPlaceholderText( 'Select a type' ), 'Str' );
		await clickLookupResult( argumentsArea, 'String' );

		// ACT: Enter a label for the first argument in Chinese.
		await fireEvent.update(
			within( argumentsArea ).getAllByPlaceholderText( 'Input label' )[ 0 ],
			'first argument label, in Chinese' );

		// ACT: Add another argument.
		await fireEvent.click( getByText( '+ Add another input' ) );

		// ACT: Select a type for the second argument.
		await fireEvent.update( within( argumentsArea ).getAllByPlaceholderText( 'Select a type' )[ 1 ], 'Str' );
		await clickLookupResult( within( argumentsArea ).getAllByRole( 'listbox', { hidden: true } )[ 1 ], 'String' );

		// ACT: Enter a label for the second argument in Chinese.
		await fireEvent.update(
			within( argumentsArea ).getAllByPlaceholderText( 'Input label' )[ 1 ],
			'second argument label, in Chinese' );

		// ACT: Attempt to click publish button,  before output is set (invalid).
		await fireEvent.click( getByText( 'Publish' ) );

		// ASSERT: Publish Dialog does not open.
		expect( queryByRole( 'dialog' ) ).not.toBeInTheDocument();

		// ASSERT: The error warning exists on the zobject showing the user they have not set an output type.
		const outputArea = getByLabelText( 'Output type' );
		expect( outputArea ).toHaveTextContent( 'A function requires an output' );

		// ACT: Select a type for the output.
		await fireEvent.update( within( outputArea ).getByRole( 'combobox' ), 'Str' );
		await clickLookupResult( outputArea, 'String' );

		// ACT: Click "Add labels in another language".
		await fireEvent.click( getByText( '+ Add labels in another language' ) );

		// ACT: Select French as the second natural language.
		const secondLanguageSelector = getAllByLabelText( 'Language' )[ 1 ];
		await fireEvent.update( within( secondLanguageSelector ).getByRole( 'combobox' ), 'Fren' );
		await clickLookupResult( secondLanguageSelector, 'French' );

		// ACT: Enter a name in French.
		await fireEvent.update( getAllByLabelText( 'Name (optional)' )[ 1 ], 'function name, in French' );

		// ACT: Enter an alias in French
		const frenchAliasInput = within( getAllByLabelText( 'Aliases (optional)' )[ 1 ] ).getByRole( 'textbox' );
		await fireEvent.update( frenchAliasInput, 'function alias, in French' );
		await fireEvent.keyDown( frenchAliasInput, { key: 'enter' } );

		// ACT: Enter a label for the first argument, in French.
		const frenchArgumentsArea = getAllByLabelText( 'Input type' )[ 1 ];
		await fireEvent.update(
			within( frenchArgumentsArea ).getAllByPlaceholderText( 'Input label' )[ 0 ],
			'first argument label, in French' );

		// ACT: Enter a label for the second argument, in French.
		await fireEvent.update(
			within( frenchArgumentsArea ).getAllByPlaceholderText( 'Input label' )[ 1 ],
			'second argument label, in French' );

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
			zobject: JSON.stringify( expectedNewFunctionPostedToApi )
		} );
	} );
} );
