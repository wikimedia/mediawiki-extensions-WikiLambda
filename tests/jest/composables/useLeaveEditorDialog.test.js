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

function createClickEvent( target, props = {} ) {
	return Object.assign( {
		target,
		button: 0,
		defaultPrevented: false,
		metaKey: false,
		ctrlKey: false,
		shiftKey: false,
		altKey: false,
		preventDefault: jest.fn()
	}, props );
}

function createExternalLink() {
	const link = document.createElement( 'a' );
	link.href = 'https://example.com/other';
	link.target = '';
	return link;
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
		const event = createClickEvent( createExternalLink() );
		getClickHandler()( event );

		expect( event.preventDefault ).toHaveBeenCalled();
		expect( result.showLeaveEditorDialog.value ).toBe( true );
		expect( result.leaveEditorCallback.value ).toBeDefined();
		result.leaveEditorCallback.value();
		expect( window.location.href ).toBe( 'https://example.com/other' );
	} );

	it( 'click on external link navigates immediately when not dirty', () => {
		const isDirty = ref( false );
		const [ result ] = loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
		const event = createClickEvent( createExternalLink() );
		getClickHandler()( event );

		expect( event.preventDefault ).toHaveBeenCalled();
		expect( result.showLeaveEditorDialog.value ).toBe( false );
		expect( window.location.href ).toBe( 'https://example.com/other' );
	} );

	it( 'click on element with no link ancestor does nothing', () => {
		const isDirty = ref( true );
		loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
		const event = createClickEvent( document.createElement( 'span' ) );
		getClickHandler()( event );

		expect( event.preventDefault ).not.toHaveBeenCalled();
	} );

	it( 'click on link without href does nothing', () => {
		const isDirty = ref( true );
		loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
		const link = document.createElement( 'a' );
		link.target = '';
		const event = createClickEvent( link );
		getClickHandler()( event );

		expect( event.preventDefault ).not.toHaveBeenCalled();
	} );

	it( 'click on link with target _blank does nothing', () => {
		const isDirty = ref( true );
		loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
		const link = createExternalLink();
		link.target = '_blank';
		const event = createClickEvent( link );
		getClickHandler()( event );

		expect( event.preventDefault ).not.toHaveBeenCalled();
	} );

	it( 'click on link with role=button does nothing', () => {
		const isDirty = ref( true );
		loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
		const link = createExternalLink();
		link.setAttribute( 'role', 'button' );
		link.role = 'button'; // ensure property is set for composable's target.role check
		const event = createClickEvent( link );
		getClickHandler()( event );

		expect( event.preventDefault ).not.toHaveBeenCalled();
	} );

	describe( 'click on external link that does not navigate the current tab', () => {
		function expectNoLeave( isDirty, props ) {
			const [ result ] = loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
			const event = createClickEvent( createExternalLink(), props );
			getClickHandler()( event );

			expect( event.preventDefault ).not.toHaveBeenCalled();
			expect( result.showLeaveEditorDialog.value ).toBe( false );
			expect( window.location.href ).toBe( 'http://example.com/' );
		}

		it( 'does nothing with the Ctrl key', () => {
			expectNoLeave( ref( true ), { ctrlKey: true } );
		} );

		it( 'does nothing with the Meta (Cmd) key', () => {
			expectNoLeave( ref( true ), { metaKey: true } );
		} );

		it( 'does nothing with the Shift key', () => {
			expectNoLeave( ref( true ), { shiftKey: true } );
		} );

		it( 'does nothing with the Alt key', () => {
			expectNoLeave( ref( true ), { altKey: true } );
		} );

		it( 'does nothing with a non-primary mouse button', () => {
			expectNoLeave( ref( true ), { button: 1 } );
		} );

		it( 'does nothing when another handler already prevented the default', () => {
			expectNoLeave( ref( true ), { defaultPrevented: true } );
		} );

		it( 'does not navigate with a modifier key when not dirty', () => {
			expectNoLeave( ref( false ), { metaKey: true } );
		} );
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

	describe( 'when the useeditwarning preference is off', () => {
		let originalGetImpl;

		beforeEach( () => {
			originalGetImpl = mw.user.options.get.getMockImplementation();
			mw.user.options.get.mockImplementation( ( key ) => key === 'useeditwarning' ? 0 : null );
		} );

		afterEach( () => {
			mw.user.options.get.mockImplementation( originalGetImpl );
		} );

		it( 'leaveTo navigates immediately when dirty', () => {
			const isDirty = ref( true );
			const [ result ] = loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
			const testUrl = 'https://example.com/page';

			result.leaveTo( testUrl );

			expect( result.showLeaveEditorDialog.value ).toBe( false );
			expect( window.location.href ).toBe( testUrl );
		} );

		it( 'beforeunload when dirty does not call preventDefault', () => {
			const isDirty = ref( true );
			loadComposable( () => useLeaveEditorDialog( { isDirty } ) );
			const preventDefault = jest.fn();
			getBeforeunloadHandler()( { preventDefault } );

			expect( preventDefault ).not.toHaveBeenCalled();
		} );
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
