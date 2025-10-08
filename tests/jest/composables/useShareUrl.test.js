/*!
 * WikiLambda unit test suite for the useShareUrl composable.
 */
'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const { mockWindowLocation, restoreWindowLocation } = require( '../fixtures/location.js' );
const useShareUrl = require( '../../../resources/ext.wikilambda.app/composables/useShareUrl.js' );

describe( 'useShareUrl', () => {
	let share;

	beforeEach( () => {
		const [ result ] = loadComposable( () => useShareUrl() );
		share = result;
	} );

	afterEach( () => {
		restoreWindowLocation();
	} );

	describe( 'loadFunctionCallFromUrl', () => {
		it( 'should do nothing if no call parameter is present', () => {
			const { sharedFunctionCall, shareUrlError, loadFunctionCallFromUrl } = share;
			mockWindowLocation( 'http://example.com/wiki/Special:RunFunction' );

			loadFunctionCallFromUrl();

			expect( sharedFunctionCall.value ).toBeNull();
			expect( shareUrlError.value ).toBeNull();
		} );

		it( 'should parse and set valid function call from URL', () => {
			const { sharedFunctionCall, shareUrlError, loadFunctionCallFromUrl } = share;
			const functionCall = { Z1K1: 'Z7', Z7K1: 'Z801', Z801K1: 'hello' };
			const encodedJson = encodeURIComponent( JSON.stringify( functionCall ) );
			mockWindowLocation( `http://example.com/wiki/Special:RunFunction?call=${ encodedJson }` );

			loadFunctionCallFromUrl();

			expect( sharedFunctionCall.value ).toEqual( functionCall );
			expect( shareUrlError.value ).toBeNull();
		} );

		it( 'should set error for invalid JSON', () => {
			const { sharedFunctionCall, shareUrlError, loadFunctionCallFromUrl } = share;
			mockWindowLocation( 'http://example.com/wiki/Special:RunFunction?call=invalid-json' );

			loadFunctionCallFromUrl();

			expect( sharedFunctionCall.value ).toBeNull();
			expect( shareUrlError.value )
				.toContain( 'Cannot load function call: Invalid JSON format in URL parameter.' );
		} );

		it( 'should set error for non-Z7 object', () => {
			const { sharedFunctionCall, shareUrlError, loadFunctionCallFromUrl } = share;
			const notFunctionCall = { Z1K1: 'Z6', Z6K1: 'just a string' };
			const encodedJson = encodeURIComponent( JSON.stringify( notFunctionCall ) );
			mockWindowLocation( `http://example.com/wiki/Special:RunFunction?call=${ encodedJson }` );

			loadFunctionCallFromUrl();

			expect( sharedFunctionCall.value ).toBeNull();
			expect( shareUrlError.value )
				.toContain( 'Cannot load function call: Invalid ZObject structure in URL parameter.' );
		} );

		it( 'should set error for function call without Z7K1', () => {
			const { sharedFunctionCall, shareUrlError, loadFunctionCallFromUrl } = share;
			const invalidFunctionCall = { Z1K1: 'Z7' };
			const encodedJson = encodeURIComponent( JSON.stringify( invalidFunctionCall ) );
			mockWindowLocation( `http://example.com/wiki/Special:RunFunction?call=${ encodedJson }` );

			loadFunctionCallFromUrl();

			expect( sharedFunctionCall.value ).toBeNull();
			expect( shareUrlError.value )
				.toContain( 'Cannot load function call: Invalid ZObject structure in URL parameter.' );
		} );

		it( 'should validate against expectedFunctionZid when provided', () => {
			const { sharedFunctionCall, shareUrlError, loadFunctionCallFromUrl } = share;
			const functionCall = { Z1K1: 'Z7', Z7K1: 'Z801', Z801K1: 'test' };
			const encodedJson = encodeURIComponent( JSON.stringify( functionCall ) );
			mockWindowLocation( `http://example.com/wiki/Z866?call=${ encodedJson }` );

			loadFunctionCallFromUrl( 'Z866' );

			expect( sharedFunctionCall.value ).toBeNull();
			expect( shareUrlError.value )
				.toContain( 'Cannot load function call: Invalid ZObject structure in URL parameter.' );
		} );

		it( 'should accept function call when expectedFunctionZid matches', () => {
			const { sharedFunctionCall, shareUrlError, loadFunctionCallFromUrl } = share;
			const functionCall = { Z1K1: 'Z7', Z7K1: 'Z801', Z801K1: 'test' };
			const encodedJson = encodeURIComponent( JSON.stringify( functionCall ) );
			mockWindowLocation( `http://example.com/wiki/Z801?call=${ encodedJson }` );

			loadFunctionCallFromUrl( 'Z801' );

			expect( sharedFunctionCall.value ).toEqual( functionCall );
			expect( shareUrlError.value ).toBeNull();
		} );

		it( 'should handle URL-encoded special characters correctly', () => {
			const { sharedFunctionCall, shareUrlError, loadFunctionCallFromUrl } = share;
			const functionCall = { Z1K1: 'Z7', Z7K1: 'Z801', Z801K1: 'hello & world = test' };
			const encodedJson = encodeURIComponent( JSON.stringify( functionCall ) );
			mockWindowLocation( `http://example.com/wiki/Special:RunFunction?call=${ encodedJson }` );

			loadFunctionCallFromUrl();

			expect( sharedFunctionCall.value ).toEqual( functionCall );
			expect( shareUrlError.value ).toBeNull();
		} );
	} );
} );
