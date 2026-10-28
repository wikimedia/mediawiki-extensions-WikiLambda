/*!
 * WikiLambda Vue editor: Drag and drop utility functions
 *
 * These functions hold the geometry of a fragment drag. They take plain
 * rectangles, so they do not touch the DOM and the tests can give them
 * any layout.
 *
 * A fragment list keeps the list type in the first position, so the
 * positions of the fragments start at 1. An insertion point is the
 * position that the fragment goes before, from 1 to the number of
 * fragments plus 1.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

// Distance in pixels that the pointer must move to start a drag
const DRAG_THRESHOLD = 5;
// Height in pixels of the band at the top and at the bottom of the viewport
// where a drag scrolls the page
const SCROLL_EDGE = 48;
// Largest scroll in pixels for each animation frame
const SCROLL_STEP_MAX = 16;

const dragUtils = {
	DRAG_THRESHOLD,
	SCROLL_EDGE,
	SCROLL_STEP_MAX,

	/**
	 * Returns whether the pointer moved far enough to start a drag.
	 * A short move is a click on the drag handle, not a drag.
	 *
	 * @param {Object} origin - Position of the pointer down, with x and y
	 * @param {Object} pointer - Current position of the pointer, with x and y
	 * @return {boolean}
	 */
	passesDragThreshold: function ( origin, pointer ) {
		const deltaX = pointer.x - origin.x;
		const deltaY = pointer.y - origin.y;
		return Math.hypot( deltaX, deltaY ) >= DRAG_THRESHOLD;
	},

	/**
	 * Returns the insertion point for the current pointer position, or null
	 * if there is no list to drop in.
	 *
	 * The fragments are a vertical list, so only the height of the pointer
	 * counts. A pointer that moves sideways out of the list, for example over
	 * the generated text, keeps the target. Above the list the target is the
	 * first position, and below the list it is the last.
	 *
	 * The pointer selects the insertion point after each fragment that its
	 * middle line passes. The middle line prevents a change of the insertion
	 * point as soon as the pointer touches a fragment.
	 *
	 * @param {Object} pointer - Position of the pointer, with x and y
	 * @param {Object|null} listRect - Rectangle of the list element
	 * @param {Array<Object>} fragmentRects - Rectangles of the fragments, in list order
	 * @return {number|null}
	 */
	getInsertionPoint: function ( pointer, listRect, fragmentRects ) {
		if ( !listRect || !fragmentRects || fragmentRects.length === 0 ) {
			return null;
		}

		const passed = fragmentRects.filter(
			( rect ) => pointer.y > rect.top + ( rect.height / 2 )
		).length;

		return passed + 1;
	},

	/**
	 * Returns the position that a fragment takes after a move to the given
	 * insertion point.
	 *
	 * The move takes the fragment out of the list before it puts the fragment
	 * back, so an insertion point after the current position loses one place.
	 *
	 * @param {number} insertionPoint
	 * @param {number} fragmentIndex - Current position of the fragment
	 * @return {number}
	 */
	getTargetIndex: function ( insertionPoint, fragmentIndex ) {
		const target = insertionPoint > fragmentIndex ? insertionPoint - 1 : insertionPoint;
		// The first position holds the list type
		return Math.max( 1, target );
	},

	/**
	 * Returns whether a move to the given insertion point changes the order
	 * of the fragments.
	 *
	 * @param {number} insertionPoint
	 * @param {number} fragmentIndex - Current position of the fragment
	 * @return {boolean}
	 */
	changesOrder: function ( insertionPoint, fragmentIndex ) {
		return dragUtils.getTargetIndex( insertionPoint, fragmentIndex ) !== fragmentIndex;
	},

	/**
	 * Returns the distance in pixels from the top of the list to the line
	 * that shows the insertion point, or null if there is no line to show.
	 *
	 * @param {number|null} insertionPoint
	 * @param {Object|null} listRect - Rectangle of the list element
	 * @param {Array<Object>} fragmentRects - Rectangles of the fragments, in list order
	 * @return {number|null}
	 */
	getInsertionOffset: function ( insertionPoint, listRect, fragmentRects ) {
		if ( !insertionPoint || !listRect || !fragmentRects || fragmentRects.length === 0 ) {
			return null;
		}

		// An insertion point past the last fragment shows the line at its bottom edge
		if ( insertionPoint > fragmentRects.length ) {
			const last = fragmentRects[ fragmentRects.length - 1 ];
			return last.top + last.height - listRect.top;
		}

		const rect = fragmentRects[ insertionPoint - 1 ];
		return rect ? rect.top - listRect.top : null;
	},

	/**
	 * Returns the rectangles of the fragments as the user sees them during a
	 * drag. The drag opens a gap before the insertion point, so the fragments
	 * from the insertion point onwards move down by the height of the gap.
	 *
	 * The layout holds the places of the fragments when the drag started,
	 * from the top of the list. The fragments move during the drag, so their
	 * own rectangles would move the target as soon as it changes.
	 *
	 * @param {Array<Object>} layout - Places of the fragments, with top from the top of the list
	 * @param {number} listTop - Top of the list in the viewport
	 * @param {number|null} insertionPoint - Position that the gap is before
	 * @param {number} gap - Height of the gap in pixels
	 * @return {Array<Object>}
	 */
	placeRects: function ( layout, listTop, insertionPoint, gap ) {
		return layout.map( ( rect, position ) => {
			// The layout holds no benjamin item, so position 0 is fragment 1
			const moved = insertionPoint !== null && position + 1 >= insertionPoint;
			return {
				top: listTop + rect.top + ( moved ? gap : 0 ),
				height: rect.height,
				left: rect.left,
				right: rect.right
			};
		} );
	},

	/**
	 * Returns the distance in pixels to scroll the page in one animation
	 * frame of a drag. A pointer near the top or the bottom edge of the
	 * viewport scrolls the page, faster as it gets nearer to the edge, so that
	 * the user can drag a fragment to a position that is not visible.
	 *
	 * @param {number} pointerY - Vertical position of the pointer in the viewport
	 * @param {number} viewportHeight
	 * @return {number} Negative to scroll up, positive to scroll down, 0 to stay
	 */
	getScrollStep: function ( pointerY, viewportHeight ) {
		const intoTop = SCROLL_EDGE - pointerY;
		if ( intoTop > 0 ) {
			return -Math.ceil( SCROLL_STEP_MAX * Math.min( 1, intoTop / SCROLL_EDGE ) );
		}
		const intoBottom = pointerY - ( viewportHeight - SCROLL_EDGE );
		if ( intoBottom > 0 ) {
			return Math.ceil( SCROLL_STEP_MAX * Math.min( 1, intoBottom / SCROLL_EDGE ) );
		}
		return 0;
	}
};

module.exports = dragUtils;
