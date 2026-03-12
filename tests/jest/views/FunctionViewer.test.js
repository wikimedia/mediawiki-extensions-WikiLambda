/*!
 * WikiLambda unit test suite for the FunctionViewer component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );
const { buildUrl } = require( '../helpers/urlHelpers.js' );
const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const { mockWindowLocation, restoreWindowLocation } = require( '../fixtures/location.js' );

const mockToast = {
	success: jest.fn(),
	error: jest.fn(),
	info: jest.fn(),
	warning: jest.fn(),
	dismiss: jest.fn()
};

const codex = require( '../helpers/loadCodexComponents.js' );
jest.spyOn( codex, 'useToast' ).mockReturnValue( mockToast );

const FunctionViewer = require( '../../../resources/ext.wikilambda.app/views/FunctionViewer.vue' );

describe( 'FunctionViewer', () => {
	const functionZid = 'Z12345';
	let store;

	function renderFunctionViewer( props = {}, options = {} ) {
		return shallowMount( FunctionViewer, {
			props,
			...options
		} );
	}

	beforeEach( () => {
		jest.clearAllMocks();
		store = useMainStore();
		store.getCurrentZObjectId = functionZid;
		store.getUserLangZid = 'Z1002';
		store.isCreateNewPage = false;
		mockWindowLocation( buildUrl( `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ functionZid }` ) );
		// Clear sessionStorage before each test
		delete mockSessionStorage[ `wikilambda-publish-success-${ functionZid }` ];
	} );

	afterEach( () => {
		restoreWindowLocation();
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionViewer();

		expect( wrapper.find( '.ext-wikilambda-app-function-viewer-view' ).exists() ).toBe( true );
	} );

	it( 'does not show success toast by default', () => {
		renderFunctionViewer();

		expect( mockToast.success ).not.toHaveBeenCalled();
	} );

	it( 'calls checkPublishSuccess on mount with current zid', () => {
		renderFunctionViewer();

		expect( store.checkPublishSuccess ).toHaveBeenCalledWith( functionZid );
	} );

	it( 'dispatches edit event when About widget emits edit-metadata', async () => {
		const wrapper = renderFunctionViewer();

		const aboutWidget = wrapper.findComponent( { name: 'wl-about-widget' } );
		aboutWidget.vm.$emit( 'edit-metadata' );

		await waitFor( () => {
			expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith(
				expect.any( String ),
				expect.any( String ),
				'edit',
				expect.objectContaining( {
					zobjecttype: Constants.Z_FUNCTION,
					zobjectid: functionZid,
					zlang: 'Z1002'
				} )
			);
		} );
	} );

	it( 'displays success toast when publish success flag is set in store', async () => {
		store.showPublishSuccess = true;
		renderFunctionViewer();

		await waitFor( () => {
			expect( mockToast.success ).toHaveBeenCalledWith(
				expect.any( String ),
				expect.objectContaining( {
					autoDismiss: true,
					onUserDismissed: expect.any( Function ),
					onAutoDismissed: expect.any( Function )
				} )
			);
		} );
	} );

	it( 'calls clearShowPublishSuccess when toast is dismissed', () => {
		store.showPublishSuccess = true;
		store.checkPublishSuccess = jest.fn();
		renderFunctionViewer();

		const onDismissSuccessToast = mockToast.success.mock.calls[ 0 ][ 1 ].onUserDismissed;
		onDismissSuccessToast();

		expect( store.clearShowPublishSuccess ).toHaveBeenCalled();
	} );

	it( 'dismisses success toast when pageshow fires with persisted (bfcache restore)', () => {
		store.showPublishSuccess = true;
		store.checkPublishSuccess = jest.fn();
		mockToast.success.mockReturnValue( 'toast-123' );
		renderFunctionViewer();

		window.dispatchEvent( new PageTransitionEvent( 'pageshow', { persisted: true } ) );

		expect( mockToast.dismiss ).toHaveBeenCalledWith( 'toast-123' );
	} );

	it( 'removes pageshow listener on unmount', () => {
		const removeSpy = jest.spyOn( window, 'removeEventListener' );
		const wrapper = renderFunctionViewer();

		wrapper.unmount();

		expect( removeSpy ).toHaveBeenCalledWith( 'pageshow', expect.any( Function ) );
		removeSpy.mockRestore();
	} );
} );
