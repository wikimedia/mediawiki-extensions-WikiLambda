/*!
 * WikiLambda unit test suite for the useLeaveEditorDialog composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { ref } = require( 'vue' );
const { mockWindowLocation, restoreWindowLocation } = require( '../fixtures/location.js' );
const loadComposable = require( '../helpers/loadComposable.js' );
const useLeaveEditorDialog = require( '../../../resources/ext.wikilambda.app/composables/useLeaveEditorDialog.js' );

jest.mock( '../../../resources/ext.wikilambda.app/utils/urlUtils.js', () => ( {
	isLinkCurrentPath: jest.fn( () => false )
} ) );

function getClickHandler() {
	return window.addEventListener.mock.calls.find( ( c ) => c[ 0 ] === 'click' )[ 1 ];
}

function getBeforeunloadHandler() {
	return window.addEventListener.mock.calls.find( ( c ) => c[ 0 ] === 'beforeunload' )[ 1 ];
}

describe( 'useLeaveEditorDialog composable', () => {
	beforeEach( () => {
		jest.spyOn( window, 'addEventListener' ).mockImplementation( () => {} );
		jest.spyOn( window, 'removeEventListener' ).mockImplementation( () => {} );
		mockWindowLocation( 'http://example.com' );
	} );

	afterEach( () => {
		window.addEventListener.mockRestore();
		window.removeEventListener.mockRestore();
		restoreWindowLocation();
	} );

	it( 'returns the expected API', () => {
		const isDirty = ref( false );
		const [ result ] = loadComposable( () => useLeaveEditorDialog( { isDirty } ) );

		expect( result ).toHaveProperty( 'closeLeaveDialog' );
		expect( result ).toHaveProperty( 'leaveEditorCallback' );
		expect( result ).toHaveProperty( 'removeListeners' );
		expect( result ).toHaveProperty( 'showLeaveEditorDialog' );
		expect( result ).toHaveProperty( 'leaveTo' );
		expect( typeof result.closeLeaveDialog ).toBe( 'function' );
		expect( typeof result.removeListeners ).toBe( 'function' );
		expect( typeof result.leaveTo ).toBe( 'function' );
	} );

	it( 'registers click and beforeunload listeners on mount', () => {
		const isDirty = ref( false );

		loadComposable( () => useLeaveEditorDialog( { isDirty } ) );

		expect( window.addEventListener ).toHaveBeenCalledWith( 'click', expect.any( Function ) );
		expect( window.addEventListener ).toHaveBeenCalledWith( 'beforeunload', expect.any( Function ) );
	} );

	it( 'unregisters listeners on unmount', () => {
		const isDirty = ref( false );
		const [ , wrapper ] = loadComposable( () => useLeaveEditorDialog( { isDirty } ) );

		wrapper.unmount();

		expect( window.removeEventListener ).toHaveBeenCalledWith( 'click', expect.any( Function ) );
		expect( window.removeEventListener ).toHaveBeenCalledWith( 'beforeunload', expect.any( Function ) );
	} );

	it( 'leaveTo navigates immediately when not dirty', () => {
		const isDirty = ref( false );
		const [ result ] = loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
		const testUrl = 'https://example.com/page';

		result.leaveTo( testUrl );

		expect( window.location.href ).toBe( testUrl );
	} );

	it( 'leaveTo shows dialog when dirty', () => {
		const isDirty = ref( true );
		const [ result ] = loadComposable( () => useLeaveEditorDialog( { isDirty } ) );

		result.leaveTo( 'https://example.com/page' );

		expect( result.showLeaveEditorDialog.value ).toBe( true );
		expect( result.leaveEditorCallback.value ).toBeDefined();
	} );

	it( 'click on external link prevents default and shows dialog when dirty', () => {
		const isDirty = ref( true );
		const [ result ] = loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
		const link = document.createElement( 'a' );
		link.href = 'https://example.com/other';
		link.target = '';
		const preventDefault = jest.fn();
		getClickHandler()( { target: link, preventDefault } );

		expect( preventDefault ).toHaveBeenCalled();
		expect( result.showLeaveEditorDialog.value ).toBe( true );
		expect( result.leaveEditorCallback.value ).toBeDefined();
		result.leaveEditorCallback.value();
		expect( window.location.href ).toBe( 'https://example.com/other' );
	} );

	it( 'click on element with no link ancestor does nothing', () => {
		const isDirty = ref( true );
		loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
		const span = document.createElement( 'span' );
		const preventDefault = jest.fn();
		getClickHandler()( { target: span, preventDefault } );

		expect( preventDefault ).not.toHaveBeenCalled();
	} );

	it( 'click on link without href does nothing', () => {
		const isDirty = ref( true );
		loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
		const link = document.createElement( 'a' );
		link.target = '';
		const preventDefault = jest.fn();
		getClickHandler()( { target: link, preventDefault } );

		expect( preventDefault ).not.toHaveBeenCalled();
	} );

	it( 'click on link with target _blank does nothing', () => {
		const isDirty = ref( true );
		loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
		const link = document.createElement( 'a' );
		link.href = 'https://example.com/other';
		link.target = '_blank';
		const preventDefault = jest.fn();
		getClickHandler()( { target: link, preventDefault } );

		expect( preventDefault ).not.toHaveBeenCalled();
	} );

	it( 'click on link with role=button does nothing', () => {
		const isDirty = ref( true );
		loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
		const link = document.createElement( 'a' );
		link.href = 'https://example.com/other';
		link.target = '';
		link.setAttribute( 'role', 'button' );
		link.role = 'button'; // ensure property is set for composable's target.role check
		const preventDefault = jest.fn();
		getClickHandler()( { target: link, preventDefault } );

		expect( preventDefault ).not.toHaveBeenCalled();
	} );

	it( 'beforeunload when dirty calls preventDefault', () => {
		const isDirty = ref( true );
		loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
		const preventDefault = jest.fn();
		getBeforeunloadHandler()( { preventDefault } );

		expect( preventDefault ).toHaveBeenCalled();
	} );

	it( 'beforeunload when not dirty does not call preventDefault', () => {
		const isDirty = ref( false );
		loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
		const preventDefault = jest.fn();
		getBeforeunloadHandler()( { preventDefault } );

		expect( preventDefault ).not.toHaveBeenCalled();
	} );

	it( 'closeLeaveDialog sets showLeaveEditorDialog to false', () => {
		const isDirty = ref( true );
		const [ result ] = loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
		result.leaveTo( 'https://example.com/page' );
		expect( result.showLeaveEditorDialog.value ).toBe( true );

		result.closeLeaveDialog();

		expect( result.showLeaveEditorDialog.value ).toBe( false );
	} );

	it( 'invoking leaveEditorCallback navigates and calls onBeforeLeave when provided', () => {
		const isDirty = ref( true );
		const onBeforeLeave = jest.fn();
		const [ result ] = loadComposable( () => useLeaveEditorDialog( { isDirty, onBeforeLeave } ) );
		const targetUrl = 'https://example.com/discard';

		result.leaveTo( targetUrl );
		result.leaveEditorCallback.value();

		expect( onBeforeLeave ).toHaveBeenCalledWith( targetUrl );
		expect( window.location.href ).toBe( targetUrl );
	} );
} );
