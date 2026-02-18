/*!
 * WikiLambda unit test suite for the useFragmentHighlightRegistry composable.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const useFragmentHighlightRegistry = require( '../../../resources/ext.wikilambda.app/composables/useFragmentHighlightRegistry.js' );

describe( 'useFragmentHighlightRegistry', () => {
	it( 'returns registerFragmentNodes, unregisterFragmentNodes, and getFragmentNodes', () => {
		const [ registry ] = loadComposable( () => useFragmentHighlightRegistry() );

		expect( typeof registry.registerFragmentNodes ).toBe( 'function' );
		expect( typeof registry.unregisterFragmentNodes ).toBe( 'function' );
		expect( typeof registry.getFragmentNodes ).toBe( 'function' );
	} );

	describe( 'registerFragmentNodes', () => {
		it( 'stores nodes for a keyPath', () => {
			const [ registry ] = loadComposable( () => useFragmentHighlightRegistry() );
			const nodes = [ { nodeType: 1 }, { nodeType: 3 } ];

			registry.registerFragmentNodes( 'section.1', nodes );

			expect( registry.getFragmentNodes( 'section.1' ) ).toEqual( nodes );
		} );

		it( 'does nothing when keyPath is empty', () => {
			const [ registry ] = loadComposable( () => useFragmentHighlightRegistry() );
			const nodes = [ { nodeType: 1 } ];

			registry.registerFragmentNodes( '', nodes );
			registry.registerFragmentNodes( undefined, nodes );

			expect( registry.getFragmentNodes( '' ) ).toBeNull();
			expect( registry.getFragmentNodes( undefined ) ).toBeNull();
		} );

		it( 'stores empty array when nodes is not an array', () => {
			const [ registry ] = loadComposable( () => useFragmentHighlightRegistry() );

			registry.registerFragmentNodes( 'section.1', null );
			expect( registry.getFragmentNodes( 'section.1' ) ).toEqual( [] );

			registry.registerFragmentNodes( 'section.2', { not: 'array' } );
			expect( registry.getFragmentNodes( 'section.2' ) ).toEqual( [] );
		} );
	} );

	describe( 'unregisterFragmentNodes', () => {
		it( 'removes nodes for a keyPath', () => {
			const [ registry ] = loadComposable( () => useFragmentHighlightRegistry() );
			registry.registerFragmentNodes( 'section.1', [ { nodeType: 1 } ] );

			registry.unregisterFragmentNodes( 'section.1' );

			expect( registry.getFragmentNodes( 'section.1' ) ).toBeNull();
		} );

		it( 'does nothing when keyPath is empty', () => {
			const [ registry ] = loadComposable( () => useFragmentHighlightRegistry() );
			registry.registerFragmentNodes( 'section.1', [ { nodeType: 1 } ] );

			registry.unregisterFragmentNodes( '' );
			registry.unregisterFragmentNodes( undefined );

			expect( registry.getFragmentNodes( 'section.1' ) ).toEqual( [ { nodeType: 1 } ] );
		} );
	} );

	describe( 'getFragmentNodes', () => {
		it( 'returns stored nodes for a registered keyPath', () => {
			const [ registry ] = loadComposable( () => useFragmentHighlightRegistry() );
			const nodes = [ { nodeType: 1 }, { nodeType: 3 } ];
			registry.registerFragmentNodes( 'section.1', nodes );

			expect( registry.getFragmentNodes( 'section.1' ) ).toEqual( nodes );
		} );

		it( 'returns null for an unregistered keyPath', () => {
			const [ registry ] = loadComposable( () => useFragmentHighlightRegistry() );

			expect( registry.getFragmentNodes( 'missing.key' ) ).toBeNull();
			expect( registry.getFragmentNodes( '' ) ).toBeNull();
		} );
	} );
} );
