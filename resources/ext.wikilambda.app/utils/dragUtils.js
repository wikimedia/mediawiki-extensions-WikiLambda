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

const dragUtils = {
	DRAG_THRESHOLD,

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
	 * if the pointer is outside the list.
	 *
	 * The pointer must stay between the start and the end edge of the list.
	 * The editor shows the fragments beside the generated text, so a pointer
	 * over the generated text must not give an insertion point.
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

		if ( pointer.x < listRect.left || pointer.x > listRect.right ) {
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
	}
};

module.exports = dragUtils;
