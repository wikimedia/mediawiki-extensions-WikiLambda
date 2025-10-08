/*!
 * WikiLambda unit test suite for the useZObject composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const useZObject = require( '../../../resources/ext.wikilambda.app/composables/useZObject.js' );
const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );

describe( 'useZObject', () => {
	describe( 'key computed property', () => {
		it( 'returns the last key in the keyPath', () => {
			const keyPath = 'main.Z2K2.Z14K1';
			const [ zobject ] = loadComposable( () => useZObject( { keyPath } ) );

			expect( zobject.key.value ).toBe( 'Z14K1' );
		} );

		it( 'returns undefined for undefined keyPath', () => {
			const keyPath = undefined;
			const [ zobject ] = loadComposable( () => useZObject( { keyPath } ) );

			expect( zobject.key.value ).toBeUndefined();
		} );

		it( 'returns undefined for non-string keyPath', () => {
			const keyPath = 123;
			const [ zobject ] = loadComposable( () => useZObject( { keyPath } ) );

			expect( zobject.key.value ).toBeUndefined();
		} );

		it( 'returns undefined for null keyPath', () => {
			const keyPath = null;
			const [ zobject ] = loadComposable( () => useZObject( { keyPath } ) );

			expect( zobject.key.value ).toBeUndefined();
		} );

		it( 'returns undefined for empty string keyPath', () => {
			const keyPath = '';
			const [ zobject ] = loadComposable( () => useZObject( { keyPath } ) );

			expect( zobject.key.value ).toBeUndefined();
		} );

		it( 'returns single key for simple keyPath', () => {
			const keyPath = 'main';
			const [ zobject ] = loadComposable( () => useZObject( { keyPath } ) );

			expect( zobject.key.value ).toBe( 'main' );
		} );
	} );

	describe( 'parentKey computed property', () => {
		it( 'returns the second to last key in the keyPath', () => {
			const keyPath = 'main.Z2K2.Z14K1';
			const [ zobject ] = loadComposable( () => useZObject( { keyPath } ) );

			expect( zobject.parentKey.value ).toBe( 'Z2K2' );
		} );

		it( 'returns undefined for single-part keyPath', () => {
			const keyPath = 'main';
			const [ zobject ] = loadComposable( () => useZObject( { keyPath } ) );

			expect( zobject.parentKey.value ).toBeUndefined();
		} );

		it( 'returns undefined for undefined keyPath', () => {
			const keyPath = undefined;
			const [ zobject ] = loadComposable( () => useZObject( { keyPath } ) );

			expect( zobject.parentKey.value ).toBeUndefined();
		} );
	} );

	describe( 'depth computed property', () => {
		it( 'calculates depth correctly for main.Z2K2', () => {
			const keyPath = 'main.Z2K2';
			const [ zobject ] = loadComposable( () => useZObject( { keyPath } ) );

			// main.Z2K2 = 2 parts - 1 = 1, (1 % 6) + 1 = 2
			expect( zobject.depth.value ).toBe( 2 );
		} );

		it( 'calculates depth correctly for deeply nested path', () => {
			const keyPath = 'main.Z2K2.Z14K1.Z16K1.Z17K1';
			const [ zobject ] = loadComposable( () => useZObject( { keyPath } ) );

			// 5 parts - 1 = 4, (4 % 6) + 1 = 5
			expect( zobject.depth.value ).toBe( 5 );
		} );

		it( 'returns 0 for undefined keyPath', () => {
			const keyPath = undefined;
			const [ zobject ] = loadComposable( () => useZObject( { keyPath } ) );

			expect( zobject.depth.value ).toBe( 0 );
		} );

		it( 'wraps around after COLOR_NESTING_LEVELS', () => {
			// Build a keyPath with COLOR_NESTING_LEVELS + 1 parts
			const parts = [ 'main' ];
			for ( let i = 0; i < Constants.COLOR_NESTING_LEVELS; i++ ) {
				parts.push( `K${ i }` );
			}
			const keyPath = parts.join( '.' );
			const [ zobject ] = loadComposable( () => useZObject( { keyPath } ) );

			// Should wrap back to 1
			expect( zobject.depth.value ).toBe( 1 );
		} );
	} );

	describe( 'utility methods', () => {
		it( 'exposes getZObjectType method', () => {
			const [ zobject ] = loadComposable( () => useZObject() );

			expect( typeof zobject.getZObjectType ).toBe( 'function' );
		} );

		it( 'exposes getZStringTerminalValue method', () => {
			const [ zobject ] = loadComposable( () => useZObject() );

			expect( typeof zobject.getZStringTerminalValue ).toBe( 'function' );
		} );

		it( 'exposes Wikidata utility methods', () => {
			const [ zobject ] = loadComposable( () => useZObject() );

			expect( typeof zobject.isWikidataEntity ).toBe( 'function' );
			expect( typeof zobject.isWikidataLiteral ).toBe( 'function' );
			expect( typeof zobject.isWikidataFetch ).toBe( 'function' );
			expect( typeof zobject.getWikidataEntityId ).toBe( 'function' );
		} );
	} );

	describe( 'optional keyPath parameter', () => {
		it( 'works without keyPath parameter', () => {
			const [ zobject ] = loadComposable( () => useZObject() );

			// Should not throw, computed properties should return default values
			expect( zobject.key.value ).toBeUndefined();
			expect( zobject.parentKey.value ).toBeUndefined();
			expect( zobject.depth.value ).toBe( 0 );
		} );
	} );
} );
