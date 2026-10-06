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

/**
 * Build a node that is in the document.
 *
 * @param {number} [nodeType]
 * @return {Object}
 */
function connectedNode( nodeType = 1 ) {
	return { nodeType, isConnected: true };
}

/**
 * Build a client rectangle.
 *
 * @param {number} top
 * @param {number} left
 * @param {number} width
 * @param {number} height
 * @return {Object}
 */
function rect( top, left, width, height ) {
	return { top, left, width, height };
}

describe( 'useFragmentHighlightRects', () => {
	let range;

	/**
	 * Make document.createRange return a range with the given client
	 * rectangles. jsdom has no layout, so it cannot measure a range.
	 *
	 * @param {Array<Object>} clientRects
	 */
	function mockRangeRects( clientRects ) {
		range = {
			setStartBefore: jest.fn(),
			setEndAfter: jest.fn(),
			getClientRects: () => clientRects
		};
		jest.spyOn( document, 'createRange' ).mockReturnValue( range );
	}

	afterEach( () => {
		jest.restoreAllMocks();
	} );

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

	it( 'measures a range from the first to the last fragment node', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 0, left: 0 } )
		} );
		const highlightedKeyPath = ref( undefined );
		const first = connectedNode( 3 );
		const middle = connectedNode();
		const last = connectedNode( 3 );
		const getFragmentNodes = ( keyPath ) => ( keyPath === 'section.1' ? [ first, middle, last ] : null );
		mockRangeRects( [ rect( 30, 50, 80, 20 ) ] );

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		highlightedKeyPath.value = 'section.1';

		await waitFor( () => {
			expect( result.rects.value ).toHaveLength( 1 );
		} );
		expect( range.setStartBefore ).toHaveBeenCalledWith( first );
		expect( range.setEndAfter ).toHaveBeenCalledWith( last );
	} );

	it( 'joins the text and the links of one line into a single rect', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 10, left: 20 } )
		} );
		const highlightedKeyPath = ref( undefined );
		const getFragmentNodes = ( keyPath ) => ( keyPath === 'section.1' ? [ connectedNode( 3 ) ] : null );
		// "Cairo is the [capital city] of [Egypt]": the range gives a rect for
		// each text run, and a rect for each link that overlaps its text.
		mockRangeRects( [
			rect( 30, 50, 80, 20 ),
			rect( 30, 130, 60, 20 ),
			rect( 30, 130, 60, 20 ),
			rect( 30, 190, 30, 20 ),
			rect( 31, 220, 40, 19 ),
			rect( 31, 220, 40, 19 )
		] );

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		highlightedKeyPath.value = 'section.1';

		await waitFor( () => {
			// The rect is relative to the container
			expect( result.rects.value ).toEqual( [ {
				top: '20px',
				left: '30px',
				width: '210px',
				height: '20px'
			} ] );
		} );
	} );

	it( 'computes one rect per line for multi-line content', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 0, left: 0 } )
		} );
		const highlightedKeyPath = ref( undefined );
		const getFragmentNodes = ( keyPath ) => ( keyPath === 'section.2' ? [ connectedNode( 3 ) ] : null );
		mockRangeRects( [
			// First line, from the middle to the end
			rect( 100, 150, 250, 20 ),
			// Second line, with a raised reference "[2]" at the end
			rect( 130, 10, 120, 20 ),
			rect( 124, 130, 15, 14 )
		] );

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		highlightedKeyPath.value = 'section.2';

		await waitFor( () => {
			expect( result.rects.value ).toEqual( [ {
				top: '100px',
				left: '150px',
				width: '250px',
				height: '20px'
			}, {
				top: '124px',
				left: '10px',
				width: '135px',
				height: '26px'
			} ] );
		} );
	} );

	it( 'computes one rect for block content that covers its text', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 0, left: 0 } )
		} );
		const highlightedKeyPath = ref( undefined );
		const getFragmentNodes = ( keyPath ) => ( keyPath === 'section.table' ? [ connectedNode() ] : null );
		// A table, and the text of its two rows
		mockRangeRects( [
			rect( 200, 10, 300, 100 ),
			rect( 210, 20, 100, 20 ),
			rect( 260, 20, 100, 20 )
		] );

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		highlightedKeyPath.value = 'section.table';

		await waitFor( () => {
			expect( result.rects.value ).toEqual( [ {
				top: '200px',
				left: '10px',
				width: '300px',
				height: '100px'
			} ] );
		} );
	} );

	it( 'skips client rects with zero width or height', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 0, left: 0 } )
		} );
		const highlightedKeyPath = ref( undefined );
		const getFragmentNodes = ( keyPath ) => ( keyPath === 'section.zero' ? [ connectedNode() ] : null );
		mockRangeRects( [
			rect( 10, 10, 0, 20 ),
			rect( 40, 10, 50, 0 ),
			rect( 70, 10, 50, 20 )
		] );

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		highlightedKeyPath.value = 'section.zero';

		await waitFor( () => {
			// Only the valid rect remains
			expect( result.rects.value ).toHaveLength( 1 );
			expect( result.rects.value[ 0 ].top ).toBe( '70px' );
			expect( result.rects.value[ 0 ].height ).toBe( '20px' );
		} );
	} );

	it( 'ignores fragment nodes that are no longer in the document', () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 0, left: 0 } )
		} );
		const highlightedKeyPath = ref( 'section.1' );
		const removed = { nodeType: 1, isConnected: false };
		const kept = connectedNode();
		const getFragmentNodes = () => [ removed, kept ];
		mockRangeRects( [ rect( 10, 10, 50, 20 ) ] );

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		result.updateRects();
		expect( range.setStartBefore ).toHaveBeenCalledWith( kept );
		expect( result.rects.value ).toHaveLength( 1 );
	} );

	it( 'returns no rects when no fragment node is in the document', () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 0, left: 0 } )
		} );
		const highlightedKeyPath = ref( 'section.orphan' );
		const getFragmentNodes = () => [ { nodeType: 3, isConnected: false } ];
		const createRange = jest.spyOn( document, 'createRange' );

		const [ result ] = loadComposable( () => useFragmentHighlightRects(
			containerRef,
			highlightedKeyPath,
			getFragmentNodes
		) );

		result.updateRects();
		expect( result.rects.value ).toEqual( [] );
		expect( createRange ).not.toHaveBeenCalled();
	} );

	it( 'returns empty rects when containerRef or highlightedKeyPath is missing', () => {
		const containerRef = ref( null );
		const highlightedKeyPath = ref( 'section.1' );
		const getFragmentNodes = () => [ connectedNode() ];

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

	it( 'clamps rect when content is above container (top < 0)', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 100, left: 0 } )
		} );
		const highlightedKeyPath = ref( undefined );
		const getFragmentNodes = ( keyPath ) => ( keyPath === 'section.top' ? [ connectedNode() ] : null );
		mockRangeRects( [ rect( 94, 10, 80, 20 ) ] );

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

	it( 'clamps rect when content is left of container (left < 0)', async () => {
		const containerRef = ref( {
			getBoundingClientRect: () => ( { top: 0, left: 100 } )
		} );
		const highlightedKeyPath = ref( undefined );
		const getFragmentNodes = ( keyPath ) => ( keyPath === 'section.left' ? [ connectedNode() ] : null );
		mockRangeRects( [ rect( 10, 94, 80, 20 ) ] );

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
		const getFragmentNodes = ( keyPath ) => ( keyPath === 'section.1' ? [ connectedNode() ] : null );
		mockRangeRects( [ rect( 10, 10, 50, 20 ) ] );

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
