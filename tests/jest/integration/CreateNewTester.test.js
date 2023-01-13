/*!
 * WikiLambda integration test for creating new tester.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
/* eslint-disable compat/compat */
'use strict';

require( '@testing-library/jest-dom' );

const { fireEvent, render, waitFor } = require( '@testing-library/vue' ),
	{ within } = require( '@testing-library/dom' ),
	{ clickLookupResult } = require( './helpers/interactionHelpers.js' ),
	store = require( '../../../resources/ext.wikilambda.edit/store/index.js' ),
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	ApiMock = require( './helpers/apiMock.js' ),
	apiGetMock = require( './helpers/apiGetMock.js' ),
	existingFunctionFromApi = require( './objects/existingFunctionFromApi.js' ),
	expectedNewTesterPostedToApi = require( './objects/expectedNewTesterPostedToApi.js' );

const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );
const lookupZObjectTypeLabels =
	new ApiMock( apiGetMock.functionLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const performTest =
	new ApiMock( apiGetMock.performTestRequest, apiGetMock.performTestResponse, apiGetMock.actionMatcher );
const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

describe( 'WikiLambda frontend, on zobject-editor view', () => {
	let apiPostWithEditTokenMock;
	beforeEach( () => {
		jest.useFakeTimers();

		Object.defineProperty( window, 'location', {
			value: {
				href: '/w/index.php?title=Special:CreateZObject&zid=Z20&Z20K1=' + functionZid
			}
		} );
		const queryParams = {
			title: Constants.PATHS.CREATE_Z_OBJECT_TITLE,
			zid: Constants.Z_TESTER,
			[ Constants.Z_TESTER_FUNCTION ]: functionZid
		};
		window.mw.Uri.mockImplementation( function () {
			return {
				query: queryParams,
				path: new window.mw.Title( Constants.PATHS.CREATE_Z_OBJECT_TITLE ).getUrl( queryParams )
			};
		} );
		global.mw.config.get = ( endpoint ) => {
			switch ( endpoint ) {
				case 'wgWikiLambda':
					return {
						zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
						createNewPage: true,
						zId: Constants.Z_TESTER
					};
				case 'wgExtensionAssetsPath':
					return '/w/extensions';
				default:
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
					initializeRootZObject,
					lookupZObjectTypeLabels,
					performTest
				] )
			};
		} );
	} );

	afterEach( () => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	} );

	it( 'allows creating a new tester', async () => {
		const {
			container,
			findByLabelText,
			findByRole,
			getAllByLabelText,
			getByLabelText,
			getByText
		} = render( App, { global: { plugins: [ store ] } } );

		// ACT: Enter a name for the tester.
		await fireEvent.update(
			within( await findByLabelText( 'Labels' ) ).getByRole( 'textbox' ),
			'tester name' );

		// ASSERT: The function specified in URL is pre-selected as the function under test.
		expect( within( getAllByLabelText( 'function:' )[ 0 ] ).getByRole( 'combobox' ) )
			.toHaveDisplayValue( 'function name, in Chinese' );

		// ACT: Select the function under test as the function call function.
		await fireEvent.update(
			within( getByLabelText( 'call:' ) ).getByPlaceholderText( 'Select a Function' ),
			'func' );
		await clickLookupResult( container, 'function name, in Chinese' );

		// ACT: Enter value for first argument.
		await fireEvent.update(
			await waitFor( () => within( getByLabelText( 'first argument label, in Afrikaans:' ) ).getByRole( 'textbox' ) ),
			'first argument value' );

		// ACT: Enter value for second argument.
		await fireEvent.update(
			within( getByLabelText( 'second argument label, in Afrikaans:' ) ).getByRole( 'textbox' ),
			'second argument value' );

		// ACT: Select String Equality as the validation call function.
		await fireEvent.update(
			within( getByLabelText( 'result validation:' ) ).getByPlaceholderText( 'Select a Function' ),
			'String eq' );
		await clickLookupResult( container, 'String equality' );

		// ACT: Enter expected value to which function call result should be compared.
		await fireEvent.update(
			await waitFor( () => within( getByLabelText( 'second string:' ) ).getByRole( 'textbox' ) ),
			'expected value' );

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
			zobject: JSON.stringify( expectedNewTesterPostedToApi )
		} );
	} );
} );
