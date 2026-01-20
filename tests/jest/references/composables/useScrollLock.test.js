/*!
 * WikiLambda unit test suite for the useScrollLock composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { ref } = require( 'vue' );
const { waitFor } = require( '@testing-library/vue' );
const loadComposable = require( '../../helpers/loadComposable.js' );
const useScrollLock = require( '../../../../resources/ext.wikilambda.references/composables/useScrollLock.js' );

describe( 'useScrollLock', () => {
	let originalBodyStyle, originalScrollY, originalScrollTo;

	beforeEach( () => {
		// Save original values
		originalBodyStyle = {
			overflow: document.body.style.overflow,
			position: document.body.style.position,
			top: document.body.style.top,
			width: document.body.style.width,
			paddingRight: document.body.style.paddingRight
		};

		originalScrollY = window.scrollY;
		originalScrollTo = window.scrollTo;

		// Mock window.scrollY
		Object.defineProperty( window, 'scrollY', {
			writable: true,
			value: 100
		} );

		// Mock window.scrollTo
		window.scrollTo = jest.fn();
	} );

	afterEach( () => {
		// Restore original values
		document.body.style.overflow = originalBodyStyle.overflow;
		document.body.style.position = originalBodyStyle.position;
		document.body.style.top = originalBodyStyle.top;
		document.body.style.width = originalBodyStyle.width;
		document.body.style.paddingRight = originalBodyStyle.paddingRight;

		Object.defineProperty( window, 'scrollY', {
			writable: true,
			value: originalScrollY
		} );
		window.scrollTo = originalScrollTo;
	} );

	describe( 'locking scroll', () => {
		it( 'locks scroll when isActive becomes true', async () => {
			const isActive = ref( false );
			loadComposable( () => useScrollLock( { isActive } ) );

			isActive.value = true;

			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( 'hidden' );
				expect( document.body.style.position ).toBe( 'fixed' );
				expect( document.body.style.top ).toBe( '-100px' );
				expect( document.body.style.width ).toBe( '100%' );
			} );
		} );

		it( 'saves scroll position before locking', async () => {
			window.scrollY = 250;
			const isActive = ref( false );
			loadComposable( () => useScrollLock( { isActive } ) );

			isActive.value = true;

			await waitFor( () => {
				expect( document.body.style.top ).toBe( '-250px' );
			} );
		} );

		it( 'adds padding-right for scrollbar compensation', async () => {
			// Mock scrollbar width
			const originalClientWidth = document.documentElement.clientWidth;
			Object.defineProperty( document.documentElement, 'clientWidth', {
				writable: true,
				value: 980 // Assuming window.innerWidth is 1000, scrollbar is 20px
			} );
			Object.defineProperty( window, 'innerWidth', {
				writable: true,
				value: 1000
			} );

			const isActive = ref( false );
			loadComposable( () => useScrollLock( { isActive } ) );

			isActive.value = true;

			await waitFor( () => {
				expect( document.body.style.paddingRight ).toBe( '20px' );
			} );

			// Restore
			Object.defineProperty( document.documentElement, 'clientWidth', {
				writable: true,
				value: originalClientWidth
			} );
		} );

		it( 'does not add padding-right when no scrollbar', async () => {
			// Mock no scrollbar
			Object.defineProperty( document.documentElement, 'clientWidth', {
				writable: true,
				value: 1000
			} );
			Object.defineProperty( window, 'innerWidth', {
				writable: true,
				value: 1000
			} );

			const isActive = ref( false );
			loadComposable( () => useScrollLock( { isActive } ) );

			isActive.value = true;

			await waitFor( () => {
				expect( document.body.style.paddingRight ).toBe( '' );
			} );
		} );
	} );

	describe( 'unlocking scroll', () => {
		it( 'unlocks scroll when isActive becomes false', async () => {
			const isActive = ref( true );
			loadComposable( () => useScrollLock( { isActive } ) );

			// Wait for immediate watch to execute
			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( 'hidden' );
			} );

			// Unlock
			isActive.value = false;

			// Verify unlocked
			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( '' );
				expect( document.body.style.position ).toBe( '' );
				expect( document.body.style.top ).toBe( '' );
				expect( document.body.style.width ).toBe( '' );
				expect( document.body.style.paddingRight ).toBe( '' );
			} );
		} );

		it( 'restores scroll position on unlock', async () => {
			window.scrollY = 150;
			const isActive = ref( true );
			loadComposable( () => useScrollLock( { isActive } ) );

			// Wait for immediate watch to execute
			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( 'hidden' );
			} );

			// Change scroll position while locked (but scrollY won't change since body is fixed)
			// The scrollPosition was saved as 150 when lockScroll was called

			// Unlock
			isActive.value = false;

			// Should restore to original position (150)
			await waitFor( () => {
				expect( window.scrollTo ).toHaveBeenCalledWith( 0, 150 );
			} );
		} );
	} );

	describe( 'cleanup on unmount', () => {
		it( 'unlocks scroll on unmount if still active', async () => {
			const isActive = ref( true );
			const [ , wrapper ] = loadComposable( () => useScrollLock( { isActive } ) );

			// Wait for immediate watch to execute
			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( 'hidden' );
			} );

			// Unmount
			wrapper.unmount();

			// Should be unlocked
			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( '' );
			} );
		} );

		it( 'does not unlock on unmount if already inactive', () => {
			const isActive = ref( false );
			const [ , wrapper ] = loadComposable( () => useScrollLock( { isActive } ) );

			// Unmount
			wrapper.unmount();

			// Should remain unchanged (no error)
			expect( document.body.style.overflow ).toBe( originalBodyStyle.overflow );
		} );
	} );

	describe( 'multiple lock/unlock cycles', () => {
		it( 'handles multiple lock/unlock cycles correctly', async () => {
			window.scrollY = 50;
			const isActive = ref( false );
			loadComposable( () => useScrollLock( { isActive } ) );

			// First lock
			isActive.value = true;
			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( 'hidden' );
				expect( document.body.style.top ).toBe( '-50px' );
			} );

			// First unlock
			isActive.value = false;
			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( '' );
			} );

			// Second lock (different scroll position)
			window.scrollY = 200;
			isActive.value = true;
			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( 'hidden' );
				expect( document.body.style.top ).toBe( '-200px' );
			} );

			// Second unlock
			isActive.value = false;
			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( '' );
				expect( window.scrollTo ).toHaveBeenLastCalledWith( 0, 200 );
			} );
		} );
	} );
} );
