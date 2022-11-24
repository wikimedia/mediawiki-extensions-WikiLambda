/* eslint-disable compat/compat */
/*!
 * WikiLambda integration test for editing a function.
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
	apiGetMock = require( './helpers/apiGetMock.js' ),
	ApiMock = require( './helpers/apiMock.js' ),
	existingFunctionFromApi = require( './objects/existingFunctionFromApi.js' ),
	expectedEditedFunctionPostedToApi = require( './objects/expectedEditedFunctionPostedToApi.js' );

const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

const lookupZObjectTypeLabels =
	new ApiMock( apiGetMock.typeLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const lookupZObjectLanguageLabels =
	new ApiMock( apiGetMock.languageLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );
const fetchZImplementations =
	new ApiMock( apiGetMock.fetchZImplementationsRequest,
		apiGetMock.zObjectSearchResponse, apiGetMock.zObjectSearchMatcher );
const fetchZTesters =
	new ApiMock( apiGetMock.fetchZTestersRequest, apiGetMock.zObjectSearchResponse, apiGetMock.zObjectSearchMatcher );
const performTest =
	new ApiMock( apiGetMock.performTestRequest, apiGetMock.performTestResponse, apiGetMock.performTestMatcher );

describe( 'WikiLambda frontend, editing an existing function, on function-editor view', () => {
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
					initializeRootZObject,
					fetchZImplementations,
					fetchZTesters,
					performTest ] )
			};
		} );

		window.mw.Uri.mockImplementation( () => {
			return {
				path: Constants.PATHS.EDIT_Z_OBJECT,
				query: {
					action: Constants.ACTIONS.EDIT,
					view: Constants.VIEWS.FUNCTION_EDITOR,
					title: functionZid
				}
			};
		} );
		global.mw.config.get = ( endpoint ) => {
			switch ( endpoint ) {
				case 'wgWikiLambda':
					return {
						zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
						zId: functionZid
					};
				default:
					return {};
			}
		};
	} );

	afterEach( () => {
		document.body.outerHTML = '';
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	} );

	// TODO(T323764): This test is currently extremely long. Consider moving some of the less-used functionality (e.g.
	// adding a function name and then immediately deleting it) into separate test cases.
	it( 'allows editing the function, making use of most important features', async () => {
		const { findAllByLabelText, findByRole, getAllByLabelText, getByText } =
			render( App, { global: { plugins: [ store ] } } );

		// ACT: Change the first argument type.
		const chineseArgumentsArea = ( await findAllByLabelText( 'Input type' ) )[ 0 ];
		const firstArgumentTypeInput = within( chineseArgumentsArea ).getAllByDisplayValue( 'String' )[ 0 ];
		await fireEvent.update( firstArgumentTypeInput, 'Str' );
		await clickLookupResult( chineseArgumentsArea, 'Monolingual stringset' );

		// ACT: Click publish button.
		await fireEvent.click( getByText( 'Publish' ) );

		// ASSERT: The warning message is shown in the dialog indicating the user has changed the argument type.
		let publishDialog = await findByRole( 'dialog' );
		expect( publishDialog ).toHaveTextContent( 'You changed the input field of this function.' );

		// ACT: Close publish dialog.
		await fireEvent.click( within( publishDialog ).getByText( 'Cancel' ) );

		// ACT: Change the first argument type back to the original type.
		await fireEvent.update( firstArgumentTypeInput, 'Str' );
		await clickLookupResult( chineseArgumentsArea, 'String' );

		// ACT: Edit the name of the function in Chinese (the first language).
		await fireEvent.update( getAllByLabelText( 'Name (optional)' )[ 0 ], 'edited function name, in Chinese' );

		// ACT: Add a second alias for the function in Chinese.
		const chineseAliasInput = getAllByLabelText( 'New alias' )[ 0 ];
		await fireEvent.update( chineseAliasInput, 'second function alias, in Chinese' );
		await fireEvent.keyDown( chineseAliasInput, { key: 'enter' } );

		// ACT: Add a label for the first argument.
		await fireEvent.update(
			within( chineseArgumentsArea ).getAllByPlaceholderText( 'Input label' )[ 0 ],
			'newly added first argument label, in Chinese' );

		// [ACT: Don't enter a label for the second argument in Chinese.]

		// ACT: Edit the label for the first argument in Afrikaans (the second language).
		const afrikaansArgumentsArea = getAllByLabelText( 'Input type' )[ 1 ];
		await fireEvent.update(
			within( afrikaansArgumentsArea ).getAllByPlaceholderText( 'Input label' )[ 0 ],
			'edited first argument label, in Afrikaans' );

		// ACT: Enter a name for the function in Afrikaans.
		const afrikaansNameInput = getAllByLabelText( 'Name (optional)' )[ 1 ];
		await fireEvent.update( afrikaansNameInput, 'function name, in Afrikaans' );

		// ACT: Delete the just-entered function name in Afrikaans.
		await fireEvent.update( afrikaansNameInput, '' );

		// ACT: Enter an alias in Afrikaans.
		const afrikaansAliasesContainer = getAllByLabelText( 'Aliases (optional)' )[ 1 ];
		const afrikaansAliasInput = within( afrikaansAliasesContainer ).getByRole( 'textbox' );
		await fireEvent.update( afrikaansAliasInput, 'first function alias, in Afrikaans' );
		await fireEvent.keyDown( afrikaansAliasInput, { key: 'enter' } );

		// ACT: Delete the just-entered alias in Afrikaans.
		await fireEvent.click( within( afrikaansAliasesContainer ).getByLabelText( 'Remove item' ) );

		// ACT: Click "Add labels in another language".
		await fireEvent.click( getByText( '+ Add labels in another language' ) );

		// ACT: Select French as a third natural language.
		const thirdLanguageSelector = getAllByLabelText( 'Language' )[ 2 ];
		await fireEvent.update( within( thirdLanguageSelector ).getByRole( 'combobox' ), 'Fren' );
		await clickLookupResult( thirdLanguageSelector, 'French' );

		// ACT: Enter a name in French.
		await fireEvent.update( getAllByLabelText( 'Name (optional)' )[ 2 ], 'function name, in French' );

		// ACT: Enter an alias in French.
		const frenchAliasInput = within( getAllByLabelText( 'Aliases (optional)' )[ 2 ] ).getByRole( 'textbox' );
		await fireEvent.update( frenchAliasInput, 'function alias, in French' );
		await fireEvent.keyDown( frenchAliasInput, { key: 'enter' } );

		// ACT: Click publish button.
		await fireEvent.click( getByText( 'Publish' ) );

		// ACT: Add a summary of your changes.
		publishDialog = await findByRole( 'dialog' );
		await fireEvent.update(
			within( publishDialog ).getByLabelText( 'How did you improve this page?' ),
			'my changes summary' );

		// ACT: Click publish button in dialog.
		await fireEvent.click( within( publishDialog ).getByText( 'Publish' ) );

		// ASSERT: Location is changed to page returned by API.
		await waitFor( () => expect( window.location.href ).toEqual( 'newPage?success=true' ) );

		// ASSERT: Correct ZID and ZObject were posted to the API.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			summary: 'my changes summary',
			zid: functionZid,
			zobject: JSON.stringify( expectedEditedFunctionPostedToApi )
		} );
	} );
} );
