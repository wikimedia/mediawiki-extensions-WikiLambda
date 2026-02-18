/*!
 * WikiLambda unit test suite for the useFragmentHighlightRects composable.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { ref } = require( 'vue' );
const { waitFor } = require( '@testing-library/vue' );

const loadComposable = require( '../helpers/loadComposable.js' );
const useFragmentHighlightRects = require( '../../../resources/ext.wikilambda.app/composables/useFragmentHighlightRects.js' );

describe( 'useFragmentHighlightRects', () => {
	it( 'returns an empty rects array when nothing is highlighted', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 10, left: 20 } )
		} );
		const highlightedKeyPath = ref( undefined );
		const getFragmentNodes = () => null;

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		await waitFor( () => {
			expect( result.rects.value ).toEqual( [] );
		} );
	} );

	it( 'computes a single rect for inline content', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 10, left: 20 } )
		} );
		const highlightedKeyPath = ref( undefined );

		const elementNode = {
			nodeType: 1,
			getBoundingClientRect: () => ( { top: 30, left: 50, width: 80, height: 20 } )
		};

		const getFragmentNodes = ( keyPath ) => {
			if ( keyPath === 'section.1' ) {
				return [ elementNode ];
			}
			return null;
		};

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		highlightedKeyPath.value = 'section.1';

		await waitFor( () => {
			// No padding: rect matches element bounds relative to container
			expect( result.rects.value ).toEqual( [ {
				top: '20px',
				left: '30px',
				width: '80px',
				height: '20px'
			} ] );
		} );
	} );

	it( 'computes multiple rects for multi-line or block content', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 0, left: 0 } )
		} );
		const highlightedKeyPath = ref( undefined );

		const element1 = {
			nodeType: 1,
			getBoundingClientRect: () => ( { top: 100, left: 10, width: 200, height: 30 } )
		};
		const element2 = {
			nodeType: 1,
			getBoundingClientRect: () => ( { top: 140, left: 10, width: 200, height: 30 } )
		};

		const getFragmentNodes = ( keyPath ) => {
			if ( keyPath === 'section.2' ) {
				return [ element1, element2 ];
			}
			return null;
		};

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		highlightedKeyPath.value = 'section.2';

		await waitFor( () => {
			// No padding: rects match element bounds relative to container
			expect( result.rects.value ).toEqual( [ {
				top: '100px',
				left: '10px',
				width: '200px',
				height: '30px'
			}, {
				top: '140px',
				left: '10px',
				width: '200px',
				height: '30px'
			} ] );
		} );
	} );

	it( 'returns no rects when fragment has only text nodes with no parentElement', () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 0, left: 0 } )
		} );
		const highlightedKeyPath = ref( 'section.orphan' );
		const textNodeNoParent = { nodeType: 3, parentElement: null };
		const getFragmentNodes = ( keyPath ) => ( keyPath === 'section.orphan' ? [ textNodeNoParent ] : null );

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		result.updateRects();
		expect( result.rects.value ).toEqual( [] );
	} );

	it( 'uses container bounds when fragment has only text nodes (plain text)', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 0, left: 0 } )
		} );
		const highlightedKeyPath = ref( undefined );

		const textNode = {
			nodeType: 3,
			parentElement: {
				getBoundingClientRect: () => ( { top: 50, left: 10, width: 100, height: 20 } )
			}
		};

		const getFragmentNodes = ( keyPath ) => {
			if ( keyPath === 'section.3' ) {
				return [ textNode ];
			}
			return null;
		};

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		highlightedKeyPath.value = 'section.3';

		await waitFor( () => {
			// No padding: parent element bounds relative to container
			expect( result.rects.value ).toEqual( [ {
				top: '50px',
				left: '10px',
				width: '100px',
				height: '20px'
			} ] );
		} );
	} );

	it( 'returns empty rects when containerRef or highlightedKeyPath is missing', () => {
		const containerRef = ref( null );
		const highlightedKeyPath = ref( 'section.1' );
		const getFragmentNodes = () => [ { nodeType: 1, getBoundingClientRect: () => ( {} ) } ];

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		result.updateRects();
		expect( result.rects.value ).toEqual( [] );
	} );

	it( 'returns empty rects when getFragmentNodes is not provided', () => {
		const containerRef = ref( { getBoundingClientRect: () => ( { top: 0, left: 0 } ) } );
		const highlightedKeyPath = ref( 'section.1' );

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			null
		) );

		result.updateRects();
		expect( result.rects.value ).toEqual( [] );
	} );

	it( 'returns empty rects when getFragmentNodes returns null or empty array', () => {
		const containerRef = ref( { getBoundingClientRect: () => ( { top: 0, left: 0 } ) } );
		const highlightedKeyPath = ref( 'section.1' );

		const [ resultNull ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			() => null
		) );
		resultNull.updateRects();
		expect( resultNull.rects.value ).toEqual( [] );

		const [ resultEmpty ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			() => []
		) );
		resultEmpty.updateRects();
		expect( resultEmpty.rects.value ).toEqual( [] );
	} );

	it( 'skips elements with zero width or height', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 0, left: 0 } )
		} );
		const highlightedKeyPath = ref( undefined );

		const zeroWidth = {
			nodeType: 1,
			getBoundingClientRect: () => ( { top: 10, left: 10, width: 0, height: 20 } )
		};
		const zeroHeight = {
			nodeType: 1,
			getBoundingClientRect: () => ( { top: 40, left: 10, width: 50, height: 0 } )
		};
		const validEl = {
			nodeType: 1,
			getBoundingClientRect: () => ( { top: 70, left: 10, width: 50, height: 20 } )
		};

		const getFragmentNodes = ( keyPath ) => {
			if ( keyPath === 'section.zero' ) {
				return [ zeroWidth, zeroHeight, validEl ];
			}
			return null;
		};

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		highlightedKeyPath.value = 'section.zero';

		await waitFor( () => {
			// Only the valid element produces a rect (no padding)
			expect( result.rects.value ).toHaveLength( 1 );
			expect( result.rects.value[ 0 ].top ).toBe( '70px' );
			expect( result.rects.value[ 0 ].height ).toBe( '20px' );
		} );
	} );

	it( 'clamps rect when element is above container (top < 0)', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 100, left: 0 } )
		} );
		const highlightedKeyPath = ref( undefined );

		const elementNode = {
			nodeType: 1,
			getBoundingClientRect: () => ( { top: 94, left: 10, width: 80, height: 20 } )
		};
		const getFragmentNodes = ( keyPath ) => ( keyPath === 'section.top' ? [ elementNode ] : null );

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		highlightedKeyPath.value = 'section.top';

		await waitFor( () => {
			// top = 94 - 100 = -6; clamped to 0, height = 20 + (-6) = 14
			expect( result.rects.value ).toHaveLength( 1 );
			expect( result.rects.value[ 0 ].top ).toBe( '0px' );
			expect( result.rects.value[ 0 ].height ).toBe( '14px' );
		} );
	} );

	it( 'clamps rect when element is left of container (left < 0)', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 0, left: 100 } )
		} );
		const highlightedKeyPath = ref( undefined );

		const elementNode = {
			nodeType: 1,
			getBoundingClientRect: () => ( { top: 10, left: 94, width: 80, height: 20 } )
		};
		const getFragmentNodes = ( keyPath ) => ( keyPath === 'section.left' ? [ elementNode ] : null );

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		highlightedKeyPath.value = 'section.left';

		await waitFor( () => {
			// left = 94 - 100 = -6; clamped to 0, width = 80 + (-6) = 74
			expect( result.rects.value ).toHaveLength( 1 );
			expect( result.rects.value[ 0 ].left ).toBe( '0px' );
			expect( result.rects.value[ 0 ].width ).toBe( '74px' );
		} );
	} );

	it( 'clears rects on unmount', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 0, left: 0 } )
		} );
		const highlightedKeyPath = ref( undefined );
		const elementNode = {
			nodeType: 1,
			getBoundingClientRect: () => ( { top: 10, left: 10, width: 50, height: 20 } )
		};
		const getFragmentNodes = ( keyPath ) => ( keyPath === 'section.1' ? [ elementNode ] : null );

		const [ result, wrapper ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		highlightedKeyPath.value = 'section.1';
		await waitFor( () => expect( result.rects.value.length ).toBeGreaterThan( 0 ) );

		wrapper.unmount();

		expect( result.rects.value ).toEqual( [] );
	} );
} );
