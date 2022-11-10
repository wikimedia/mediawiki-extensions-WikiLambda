/* eslint-disable compat/compat */
/*!
 * WikiLambda integration test for evaluating a function call on the Special: Evaluate Function Call page.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { CdxLookup } = require( '@wikimedia/codex' ),
	{ awaitLookup, clickItemInMenu, ticksUntilTrue } = require( './helpers/interactionHelpers.js' ),
	mount = require( '@vue/test-utils' ).mount,
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	Dialog = require( '../../../resources/ext.wikilambda.edit/components/base/Dialog.vue' ),
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
	let wrapper,
		apiPostWithFunctionCallMock;
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

		wrapper = mount( App, { global: { plugins: [ store ] } } );
	} );
	afterEach( () => {
		// Clear the element that was added for the Teleported dialog component.
		document.body.outerHTML = '';
	} );
	it( 'allows choosing a function and calling it', async () => {
		// ACT: Lookup function name and select it.
		const functionLookup = wrapper.find( '.ext-wikilambda-function-call-block__select-function' ).getComponent( CdxLookup );
		functionLookup.vm.$emit( 'input', 'funct' );
		await awaitLookup( wrapper );
		await clickItemInMenu( functionLookup, 'function name, in Chinese' );

		// ASSERT: Fetched function is displayed.
		const functionCallName = wrapper.find( '.ext-wikilambda-referenced-type' );
		expect( functionCallName.text() ).toBe( 'function name, in Chinese' );

		await ticksUntilTrue( wrapper, () => wrapper.findAll( '.ext-wikilambda-zstring' )[ 0 ] &&
			wrapper.findAll( '.ext-wikilambda-zstring' )[ 0 ].exists() );

		// ASSERT: All function arguments are displayed.
		const functionArguments = wrapper.findAll( '.ext-wikilambda-zobject-key' );
		expect( functionArguments.length ).toBe( 2 );

		// ASSERT: First argument is correct.
		expect( functionArguments[ 0 ].text() ).toContain( 'first argument label, in Afrikaans:' );

		// ACT: Enter a value for the first argument.
		await wrapper.findAll( '.ext-wikilambda-zstring input' )[ 0 ].setValue( 'first argument value' );

		// ASSERT: Second argument is correct.
		expect( functionArguments[ 1 ].text() ).toContain( 'second argument label, in Afrikaans:' );

		// ACT: Enter a value for the second argument.
		await wrapper.findAll( '.ext-wikilambda-zstring input' )[ 1 ].setValue( 'second argument value' );

		// ACT: Click the Call Function button.
		await wrapper.get( '.ext-wikilambda-function-call-button' ).trigger( 'click' );
		jest.runAllTimers();

		// ASSERT: The correct function call is sent to the API with the newly input values.
		expect( apiPostWithFunctionCallMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_function_call',
			wikilambda_function_call_zobject: JSON.stringify( expectedFunctionCallPostedToApi )
		} );

		// ASSERT: The performing orchestration message is displayed.
		expect( wrapper.find( '.ext-wikilambda-orchestrated-result' ).text() ).toBe( 'wikilambda-orchestrated-loading' );

		await ticksUntilTrue( wrapper, () => wrapper.find( '.ext-wikilambda-zresponseenvelope' ) &&
			wrapper.find( '.ext-wikilambda-zresponseenvelope' ).exists() );

		// ASSERT: The orchestration completes.
		expect( wrapper.find( '.ext-wikilambda-orchestrated-result' ).text() ).toContain( 'wikilambda-orchestrated' );

		// ASSERT: The result from the function call is displayed.
		expect( wrapper.findAll( '.ext-wikilambda-zstring' )[ 4 ].text() ).toBe( 'the function call result' );

		// ACT: Click the show metrics button.
		await wrapper.find( '.ext-wikilambda-zresponseenvelope__show-metrics button' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		// ASSERT: The metadata is displayed in the dialog.
		const baseDialog = wrapper.getComponent( Dialog );
		expect( baseDialog.find( '.ext-wikilambda-dialog__body' ).text() )
			.toContain( 'wikilambda-functioncall-metadata-orchestration-start-time: 10 seconds ago' );
		expect( baseDialog.find( '.ext-wikilambda-dialog__body' ).text() )
			.toContain( 'wikilambda-functioncall-metadata-orchestration-end-time: 1 second ago' );
		expect( baseDialog.find( '.ext-wikilambda-dialog__body' ).text() )
			.toContain( 'wikilambda-functioncall-metadata-orchestration-duration: 146ms' );
	} );
} );
