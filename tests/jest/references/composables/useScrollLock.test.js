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
	let originalOverflow, originalPaddingRight;

	beforeEach( () => {
		originalOverflow = document.body.style.overflow;
		originalPaddingRight = document.body.style.paddingRight;
	} );

	afterEach( () => {
		document.body.style.overflow = originalOverflow;
		document.body.style.paddingRight = originalPaddingRight;
	} );

	describe( 'locking scroll', () => {
		it( 'locks scroll when isActive becomes true', async () => {
			const isActive = ref( false );
			loadComposable( () => useScrollLock( isActive ) );

			isActive.value = true;

			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( 'hidden' );
			} );
		} );

		it( 'does not add padding-right when no scrollbar', async () => {
			// getScrollbarWidth() returns 0 when root has no vertical overflow
			const root = document.documentElement;
			Object.defineProperty( root, 'scrollHeight', { value: 500, configurable: true } );
			Object.defineProperty( root, 'clientHeight', { value: 500, configurable: true } );

			const isActive = ref( false );
			loadComposable( () => useScrollLock( isActive ) );

			isActive.value = true;

			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( 'hidden' );
				expect( document.body.style.paddingRight ).toBe( '' );
			} );
		} );

		it( 'adds padding-right for scrollbar compensation when scrollbar is present', async () => {
			// getScrollbarWidth() returns 0 when root has no overflow; so give root overflow first
			const root = document.documentElement;
			Object.defineProperty( root, 'scrollHeight', { value: 2000, configurable: true } );
			Object.defineProperty( root, 'clientHeight', { value: 1000, configurable: true } );

			// Stub the measurement div so offsetWidth - clientWidth = 20
			const originalCreateElement = document.createElement.bind( document );
			document.createElement = ( tagName ) => {
				const el = originalCreateElement( tagName );
				if ( tagName === 'div' ) {
					Object.defineProperty( el, 'offsetWidth', { value: 120, configurable: true } );
					Object.defineProperty( el, 'clientWidth', { value: 100, configurable: true } );
				}
				return el;
			};

			const isActive = ref( false );
			loadComposable( () => useScrollLock( isActive ) );

			isActive.value = true;

			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( 'hidden' );
				expect( document.body.style.paddingRight ).toBe( '20px' );
			} );

			document.createElement = originalCreateElement;
		} );
	} );

	describe( 'unlocking scroll', () => {
		it( 'unlocks scroll when isActive becomes false', async () => {
			const isActive = ref( true );
			loadComposable( () => useScrollLock( isActive ) );

			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( 'hidden' );
			} );

			isActive.value = false;

			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( '' );
				expect( document.body.style.paddingRight ).toBe( '' );
			} );
		} );

		it( 'removes padding-right on unlock', async () => {
			// Lock with scrollbar so paddingRight is set, then unlock and assert it is cleared
			const root = document.documentElement;
			Object.defineProperty( root, 'scrollHeight', { value: 2000, configurable: true } );
			Object.defineProperty( root, 'clientHeight', { value: 1000, configurable: true } );
			const originalCreateElement = document.createElement.bind( document );
			document.createElement = ( tagName ) => {
				const el = originalCreateElement( tagName );
				if ( tagName === 'div' ) {
					Object.defineProperty( el, 'offsetWidth', { value: 120, configurable: true } );
					Object.defineProperty( el, 'clientWidth', { value: 100, configurable: true } );
				}
				return el;
			};

			const isActive = ref( true );
			loadComposable( () => useScrollLock( isActive ) );

			await waitFor( () => {
				expect( document.body.style.paddingRight ).toBe( '20px' );
			} );

			isActive.value = false;

			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( '' );
				expect( document.body.style.paddingRight ).toBe( '' );
			} );

			document.createElement = originalCreateElement;
		} );
	} );

	describe( 'cleanup on unmount', () => {
		it( 'unlocks scroll on unmount if still active', async () => {
			const isActive = ref( true );
			const [ , wrapper ] = loadComposable( () => useScrollLock( isActive ) );

			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( 'hidden' );
			} );

			wrapper.unmount();

			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( '' );
				expect( document.body.style.paddingRight ).toBe( '' );
			} );
		} );

		it( 'does not unlock on unmount if already inactive', () => {
			const isActive = ref( false );
			const [ , wrapper ] = loadComposable( () => useScrollLock( isActive ) );

			wrapper.unmount();

			expect( document.body.style.overflow ).toBe( originalOverflow );
		} );
	} );

	describe( 'multiple lock/unlock cycles', () => {
		it( 'handles multiple lock/unlock cycles correctly', async () => {
			const isActive = ref( false );
			loadComposable( () => useScrollLock( isActive ) );

			isActive.value = true;
			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( 'hidden' );
			} );

			isActive.value = false;
			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( '' );
				expect( document.body.style.paddingRight ).toBe( '' );
			} );

			isActive.value = true;
			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( 'hidden' );
			} );

			isActive.value = false;
			await waitFor( () => {
				expect( document.body.style.overflow ).toBe( '' );
				expect( document.body.style.paddingRight ).toBe( '' );
			} );
		} );
	} );
} );
