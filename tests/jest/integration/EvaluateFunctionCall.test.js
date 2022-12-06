/* eslint-disable compat/compat */
/*!
 * WikiLambda integration test for evaluating a function call on the Special: Evaluate Function Call page.
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
	expectedFunctionCallPostedToApi = require( './objects/expectedFunctionCallPostedToApi.js' ),
	functionCallResultFromApi = require( './objects/functionCallResultFromApi.js' );

const lookupZObjectTypeLabels =
	new ApiMock( apiGetMock.functionLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );

describe( 'Wikilambda frontend, running a function on evaluate function call view', () => {
	let apiPostWithFunctionCallMock;
	beforeEach( () => {
		// Needed because of the Teleported dialog component.
		const el = document.createElement( 'div' );
		el.id = 'ext-wikilambda-app';
		document.body.appendChild( el );

		global.window = Object.create( window );

		jest.useFakeTimers().setSystemTime( new Date( '2022-11-09T19:56:53Z' ) );

		apiPostWithFunctionCallMock = jest.fn( () => Promise.resolve(
			{
				query: {
					wikilambda_function_call: { success: '',
						data: JSON.stringify( functionCallResultFromApi )
					}
				}
			}
		) );

		mw.Api = jest.fn( () => {
			return {
				post: apiPostWithFunctionCallMock,
				get: apiGetMock.createMockApi( [
					lookupZObjectTypeLabels,
					initializeRootZObject ] )
			};
		} );

		window.mw.Uri.mockImplementation( () => {
			return {
				path: Constants.PATHS.EVALUATE_FUNCTION_CALL,
				query: {
					view: Constants.VIEWS.Z_OBJECT_EDITOR
				}
			};
		} );

		global.mw.config.get = ( endpoint ) => {
			switch ( endpoint ) {
				case 'wgWikiLambda':
					return {
						evaluateFunctionCall: true,
						viewmode: false
					};
				default:
					return {};
			}
		};
	} );

	afterEach( () => {
		// Clear the element that was added for the Teleported dialog component.
		document.body.outerHTML = '';
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	} );

	it( 'allows choosing a function and calling it', async () => {
		const { findByPlaceholderText, findByRole, findByText, getByLabelText, getByText, queryByText, container } =
			render( App, { global: { plugins: [ store ] } } );

		// ACT: Lookup function name and select it.
		await fireEvent.update( await findByPlaceholderText( 'Select a Function' ), 'funct' );
		await clickLookupResult( container, 'function name, in Chinese' );

		// ASSERT: Fetched function is displayed.
		expect( queryByText( 'function name, in Chinese' ) ).toBeInTheDocument();

		// ASSERT: First argument is displayed with correct label.
		expect( queryByText( 'first argument label, in Afrikaans:' ) ).toBeInTheDocument();

		// ASSERT: First argument is displayed with correct type.
		expect(
			await waitFor(
				() => within( getByLabelText( 'first argument label, in Afrikaans:' ) ).getByText( 'String' ) ) )
			.toBeInTheDocument();

		// ACT: Enter a value for the first argument.
		await fireEvent.input(
			within( getByLabelText( 'first argument label, in Afrikaans:' ) ).getByRole( 'textbox' ),
			{ target: { value: 'first argument value' } } );

		// ASSERT: Second argument is displayed with correct label.
		expect( queryByText( 'second argument label, in Afrikaans:' ) ).toBeInTheDocument();

		// ASSERT: Second argument is displayed with correct type.
		expect( within( getByLabelText( 'second argument label, in Afrikaans:' ) ).getByText( 'String' ) )
			.toBeInTheDocument();

		// ACT: Enter a value for the second argument.
		await fireEvent.input(
			within( getByLabelText( 'second argument label, in Afrikaans:' ) ).getByRole( 'textbox' ),
			{ target: { value: 'second argument value' } } );

		// ACT: Click the Call Function button.
		await fireEvent.click( getByText( 'Call Function' ) );

		// ASSERT: The correct function call is sent to the API with the newly input values.
		expect( apiPostWithFunctionCallMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			wikilambda_function_call_zobject: JSON.stringify( expectedFunctionCallPostedToApi )
		} );

		// ASSERT: The performing orchestration message is displayed.
		expect( queryByText( 'Performing orchestration, please wait' ) ).toBeInTheDocument();

		// ASSERT: Eventually the orchestration is displayed as completed.
		expect( await findByText( 'Orchestration result' ) ).toBeInTheDocument();

		// ASSERT: The result from the function call is displayed.
		expect( queryByText( 'the function call result' ) ).toBeInTheDocument();

		// ACT: Click the show metrics button.
		await fireEvent.click( getByText( 'Show metrics' ) );

		// ASSERT: The metadata is displayed in the dialog.
		const dialog = await findByRole( 'dialog' );
		expect( dialog ).toHaveTextContent( 'Orchestration start time: 10 seconds ago' );
		expect( dialog ).toHaveTextContent( 'Orchestration end time: 1 second ago' );
		expect( dialog ).toHaveTextContent( 'Orchestration duration: 146ms' );
	} );
} );
