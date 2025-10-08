/*!
 * WikiLambda unit test suite for useClipboardManager composable
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const { waitFor } = require( '@testing-library/vue' );
const useClipboardManager = require( '../../../resources/ext.wikilambda.app/composables/useClipboardManager.js' );

describe( 'useClipboardManager', () => {
	let wrapper, clipboardManager;
	let addEventListenerSpy;
	let removeEventListenerSpy;

	beforeEach( () => {
		// Mock navigator.clipboard
		navigator.clipboard = {
			writeText: jest.fn().mockResolvedValue()
		};

		// Spy on window event listeners
		addEventListenerSpy = jest.spyOn( window, 'addEventListener' );
		removeEventListenerSpy = jest.spyOn( window, 'removeEventListener' );

		// Mount component
		const [ result, wrapperInstance ] = loadComposable( () => useClipboardManager( {
			classNames: [ 'test-copyable' ]
		} ) );
		wrapper = wrapperInstance;
		clipboardManager = result;

		jest.useFakeTimers();
	} );

	afterEach( () => {
		wrapper.unmount();
		jest.useRealTimers();
		jest.restoreAllMocks();
	} );

	describe( 'event listener setup', () => {
		it( 'attaches click event listener on mount', () => {
			expect( addEventListenerSpy ).toHaveBeenCalledWith( 'click', expect.any( Function ) );
		} );

		it( 'attaches keydown event listener on mount', () => {
			expect( addEventListenerSpy ).toHaveBeenCalledWith( 'keydown', expect.any( Function ) );
		} );

		it( 'removes event listeners on unmount', () => {
			wrapper.unmount();

			expect( removeEventListenerSpy ).toHaveBeenCalledWith( 'click', expect.any( Function ) );
			expect( removeEventListenerSpy ).toHaveBeenCalledWith( 'keydown', expect.any( Function ) );
		} );
	} );

	describe( 'clipboard operations via event handlers', () => {
		it( 'copies text when clicking on element with target class', async () => {
			const testElement = document.createElement( 'div' );
			testElement.className = 'test-copyable';
			testElement.textContent = 'Copy Me';
			document.body.appendChild( testElement );

			testElement.click();
			await waitFor( () => {
				expect( navigator.clipboard.writeText ).toHaveBeenCalledWith( 'Copy Me' );
				expect( testElement.getAttribute( 'data-copied' ) ).toBe( 'true' );
				expect( testElement.innerText ).toBe( 'Copied!' );
			} );

			document.body.removeChild( testElement );
		} );

		it( 'copies text when pressing Enter on element with target class', async () => {
			const testElement = document.createElement( 'div' );
			testElement.className = 'test-copyable';
			testElement.textContent = 'Press Enter';
			document.body.appendChild( testElement );

			const enterEvent = new KeyboardEvent( 'keydown', { key: 'Enter', bubbles: true } );
			testElement.dispatchEvent( enterEvent );
			await waitFor( () => {
				expect( navigator.clipboard.writeText ).toHaveBeenCalledWith( 'Press Enter' );
			} );

			document.body.removeChild( testElement );
		} );

		it( 'does not copy when pressing non-Enter key', () => {
			const testElement = document.createElement( 'div' );
			testElement.className = 'test-copyable';
			testElement.textContent = 'Press Escape';
			document.body.appendChild( testElement );

			const escapeEvent = new KeyboardEvent( 'keydown', { key: 'Escape', bubbles: true } );
			testElement.dispatchEvent( escapeEvent );

			expect( navigator.clipboard.writeText ).not.toHaveBeenCalled();

			document.body.removeChild( testElement );
		} );

		it( 'does not copy from elements without target class', () => {
			const testElement = document.createElement( 'div' );
			testElement.className = 'not-copyable';
			testElement.textContent = 'Cannot Copy';
			document.body.appendChild( testElement );

			testElement.click();

			expect( navigator.clipboard.writeText ).not.toHaveBeenCalled();

			document.body.removeChild( testElement );
		} );

		it( 'does not copy if element already has data-copied attribute', () => {
			const testElement = document.createElement( 'div' );
			testElement.className = 'test-copyable';
			testElement.textContent = 'Already Copied';
			testElement.setAttribute( 'data-copied', 'true' );
			document.body.appendChild( testElement );

			testElement.click();

			expect( navigator.clipboard.writeText ).not.toHaveBeenCalled();

			document.body.removeChild( testElement );
		} );

		it( 'restores original text after 2 seconds', async () => {
			const testElement = document.createElement( 'div' );
			testElement.className = 'test-copyable';
			testElement.textContent = 'Original Text';
			document.body.appendChild( testElement );

			testElement.click();
			await waitFor( () => {
				expect( testElement.innerText ).toBe( 'Copied!' );
			} );

			jest.advanceTimersByTime( 2000 );

			await waitFor( () => {
				expect( testElement.innerText ).toBe( 'Original Text' );
				expect( testElement.hasAttribute( 'data-copied' ) ).toBe( false );
			} );

			document.body.removeChild( testElement );
		} );
	} );

	describe( 'returns clipboard composable API', () => {
		it( 'exposes clipboard functionality', () => {
			// Clipboard logic is fully tested in useClipboard.test.js
			// This just verifies the API is exposed
			expect( clipboardManager.itemsCopied ).toBeDefined();
			expect( clipboardManager.getCopiedText ).toBeDefined();
			expect( clipboardManager.copy ).toBeDefined();
			expect( clipboardManager.clear ).toBeDefined();
			expect( clipboardManager.copyToClipboard ).toBeDefined();
			expect( clipboardManager.showValueOrCopiedMessage ).toBeDefined();
		} );
	} );
} );
