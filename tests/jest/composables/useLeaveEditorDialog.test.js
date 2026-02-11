/*!
 * WikiLambda unit test suite for the useLeaveEditorDialog composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { ref } = require( 'vue' );
const loadComposable = require( '../helpers/loadComposable.js' );
const useLeaveEditorDialog = require( '../../../resources/ext.wikilambda.app/composables/useLeaveEditorDialog.js' );

describe( 'useLeaveEditorDialog composable', () => {
	beforeEach( () => {
		jest.spyOn( window, 'addEventListener' ).mockImplementation( () => {} );
		jest.spyOn( window, 'removeEventListener' ).mockImplementation( () => {} );
	} );

	afterEach( () => {
		window.addEventListener.mockRestore();
		window.removeEventListener.mockRestore();
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

		Object.defineProperty( window, 'location', {
			value: { href: '' },
			writable: true
		} );

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
} );
