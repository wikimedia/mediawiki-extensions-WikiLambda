/*!
 * WikiLambda unit test suite for the useClipboard composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const useClipboard = require( '../../../resources/ext.wikilambda.app/composables/useClipboard.js' );

describe( 'useClipboard', () => {
	let clipboard;

	beforeEach( () => {
		navigator.clipboard = {
			writeText: jest.fn().mockResolvedValue()
		};

		jest.useFakeTimers();

		const [ result ] = loadComposable( () => useClipboard() );
		clipboard = result;
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	describe( 'getCopiedText', () => {
		it( 'returns the translated "copied" text', () => {
			expect( clipboard.getCopiedText.value ).toBe( 'Copied!' );
		} );
	} );

	describe( 'copy', () => {
		it( 'adds a value to the itemsCopied array', () => {
			clipboard.copy( 'test-value' );

			expect( clipboard.itemsCopied.value ).toContain( 'test-value' );
			expect( clipboard.itemsCopied.value.length ).toBe( 1 );
		} );

		it( 'can add multiple values', () => {
			clipboard.copy( 'value1' );
			clipboard.copy( 'value2' );
			clipboard.copy( 'value3' );

			expect( clipboard.itemsCopied.value ).toEqual( [ 'value1', 'value2', 'value3' ] );
		} );
	} );

	describe( 'clear', () => {
		it( 'removes the first value from the itemsCopied array', () => {
			clipboard.copy( 'value1' );
			clipboard.copy( 'value2' );
			clipboard.clear();

			expect( clipboard.itemsCopied.value ).toEqual( [ 'value2' ] );
		} );

		it( 'handles empty array gracefully', () => {
			clipboard.clear();

			expect( clipboard.itemsCopied.value ).toEqual( [] );
		} );
	} );

	describe( 'copyToClipboard', () => {
		it( 'writes text to clipboard', () => {
			clipboard.copyToClipboard( 'test-value' );

			expect( navigator.clipboard.writeText ).toHaveBeenCalledWith( 'test-value' );
		} );

		it( 'calls custom copy function if provided', () => {
			const customCopyFn = jest.fn();

			clipboard.copyToClipboard( 'test-value', customCopyFn );

			expect( customCopyFn ).toHaveBeenCalled();
			expect( clipboard.itemsCopied.value ).not.toContain( 'test-value' );
		} );

		it( 'uses default copy if no custom function provided', () => {
			clipboard.copyToClipboard( 'test-value' );

			expect( clipboard.itemsCopied.value ).toContain( 'test-value' );
		} );

		it( 'calls clear function after timeout', () => {
			const customClearFn = jest.fn();

			clipboard.copyToClipboard( 'test-value', null, customClearFn );

			jest.advanceTimersByTime( 2000 );

			expect( customClearFn ).toHaveBeenCalled();
		} );

		it( 'uses default clear after 2 seconds if no custom function', () => {
			clipboard.copy( 'value1' );
			clipboard.copyToClipboard( 'value2' );

			expect( clipboard.itemsCopied.value ).toEqual( [ 'value1', 'value2' ] );

			jest.advanceTimersByTime( 2000 );

			expect( clipboard.itemsCopied.value ).toEqual( [ 'value2' ] );
		} );
	} );

	describe( 'showValueOrCopiedMessage', () => {
		it( 'returns the copied text if value is in itemsCopied', () => {
			clipboard.copy( 'test-value' );

			expect( clipboard.showValueOrCopiedMessage( 'test-value' ) ).toBe( 'Copied!' );
		} );

		it( 'returns the original value if not in itemsCopied', () => {
			expect( clipboard.showValueOrCopiedMessage( 'test-value' ) ).toBe( 'test-value' );
		} );

		it( 'returns value after clear is called', () => {
			clipboard.copy( 'test-value' );
			expect( clipboard.showValueOrCopiedMessage( 'test-value' ) ).toBe( 'Copied!' );

			clipboard.clear();
			expect( clipboard.showValueOrCopiedMessage( 'test-value' ) ).toBe( 'test-value' );
		} );
	} );
} );
