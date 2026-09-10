/*!
 * WikiLambda unit test suite for the dragUtils util
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const {
	DRAG_THRESHOLD,
	passesDragThreshold,
	getInsertionPoint,
	getTargetIndex,
	changesOrder,
	getInsertionOffset
} = require( '../../../resources/ext.wikilambda.app/utils/dragUtils.js' );

describe( 'dragUtils', () => {
	// A list of three fragments, each 20px high, from y=100 to y=160
	const listRect = { top: 100, left: 0, right: 200, height: 60 };
	const fragmentRects = [
		{ top: 100, left: 0, right: 200, height: 20 },
		{ top: 120, left: 0, right: 200, height: 20 },
		{ top: 140, left: 0, right: 200, height: 20 }
	];

	describe( 'passesDragThreshold', () => {
		it( 'returns false when the pointer does not move', () => {
			expect( passesDragThreshold( { x: 10, y: 10 }, { x: 10, y: 10 } ) ).toBe( false );
		} );

		it( 'returns false for a move shorter than the threshold', () => {
			expect( passesDragThreshold( { x: 10, y: 10 }, { x: 12, y: 12 } ) ).toBe( false );
		} );

		it( 'returns true for a move at the threshold', () => {
			expect( passesDragThreshold( { x: 10, y: 10 }, { x: 10, y: 10 + DRAG_THRESHOLD } ) ).toBe( true );
		} );

		it( 'returns true for a long move in any direction', () => {
			expect( passesDragThreshold( { x: 10, y: 10 }, { x: 10, y: -40 } ) ).toBe( true );
			expect( passesDragThreshold( { x: 10, y: 10 }, { x: -40, y: 10 } ) ).toBe( true );
		} );
	} );

	describe( 'getInsertionPoint', () => {
		it( 'returns null when there are no fragments', () => {
			expect( getInsertionPoint( { x: 50, y: 110 }, listRect, [] ) ).toBeNull();
		} );

		it( 'returns null when there is no list rectangle', () => {
			expect( getInsertionPoint( { x: 50, y: 110 }, null, fragmentRects ) ).toBeNull();
		} );

		it( 'returns null when the pointer is right of the list', () => {
			expect( getInsertionPoint( { x: 260, y: 110 }, listRect, fragmentRects ) ).toBeNull();
		} );

		it( 'returns null when the pointer is left of the list', () => {
			expect( getInsertionPoint( { x: -10, y: 110 }, listRect, fragmentRects ) ).toBeNull();
		} );

		it( 'returns the first insertion point above the middle of the first fragment', () => {
			expect( getInsertionPoint( { x: 50, y: 105 }, listRect, fragmentRects ) ).toBe( 1 );
		} );

		it( 'returns the next insertion point below the middle of a fragment', () => {
			expect( getInsertionPoint( { x: 50, y: 115 }, listRect, fragmentRects ) ).toBe( 2 );
		} );

		it( 'returns the insertion point past the last fragment', () => {
			expect( getInsertionPoint( { x: 50, y: 155 }, listRect, fragmentRects ) ).toBe( 4 );
		} );

		it( 'returns the first insertion point above the list', () => {
			expect( getInsertionPoint( { x: 50, y: 10 }, listRect, fragmentRects ) ).toBe( 1 );
		} );

		it( 'returns the last insertion point below the list', () => {
			expect( getInsertionPoint( { x: 50, y: 900 }, listRect, fragmentRects ) ).toBe( 4 );
		} );
	} );

	describe( 'getTargetIndex', () => {
		it( 'keeps the insertion point for a move up the list', () => {
			expect( getTargetIndex( 1, 3 ) ).toBe( 1 );
		} );

		it( 'loses one place for a move down the list', () => {
			expect( getTargetIndex( 4, 1 ) ).toBe( 3 );
		} );

		it( 'gives the current position for the insertion point at the fragment', () => {
			expect( getTargetIndex( 2, 2 ) ).toBe( 2 );
		} );

		it( 'gives the current position for the insertion point after the fragment', () => {
			expect( getTargetIndex( 3, 2 ) ).toBe( 2 );
		} );

		it( 'never gives the position of the list type', () => {
			expect( getTargetIndex( 1, 1 ) ).toBe( 1 );
			expect( getTargetIndex( 0, 2 ) ).toBe( 1 );
		} );
	} );

	describe( 'changesOrder', () => {
		it( 'returns false for the insertion point at the fragment', () => {
			expect( changesOrder( 2, 2 ) ).toBe( false );
		} );

		it( 'returns false for the insertion point after the fragment', () => {
			expect( changesOrder( 3, 2 ) ).toBe( false );
		} );

		it( 'returns true for an insertion point up the list', () => {
			expect( changesOrder( 1, 2 ) ).toBe( true );
		} );

		it( 'returns true for an insertion point down the list', () => {
			expect( changesOrder( 4, 2 ) ).toBe( true );
		} );
	} );

	describe( 'getInsertionOffset', () => {
		it( 'returns null when there is no insertion point', () => {
			expect( getInsertionOffset( null, listRect, fragmentRects ) ).toBeNull();
		} );

		it( 'returns null when there are no fragments', () => {
			expect( getInsertionOffset( 1, listRect, [] ) ).toBeNull();
		} );

		it( 'returns the top edge of the first fragment', () => {
			expect( getInsertionOffset( 1, listRect, fragmentRects ) ).toBe( 0 );
		} );

		it( 'returns the top edge of a middle fragment', () => {
			expect( getInsertionOffset( 2, listRect, fragmentRects ) ).toBe( 20 );
		} );

		it( 'returns the bottom edge of the last fragment', () => {
			expect( getInsertionOffset( 4, listRect, fragmentRects ) ).toBe( 60 );
		} );
	} );
} );
