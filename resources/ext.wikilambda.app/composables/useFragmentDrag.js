/*!
 * Drag behaviour for the Abstract Content fragments, so that the user can
 * move a fragment to another position with the pointer.
 *
 * The composable holds the state of one drag and listens for the pointer.
 * It does not read the DOM: the caller gives it the functions that measure
 * the list and the fragments, so the tests can give it any layout.
 *
 * The drag needs the mouse, a touch or a pen, so it uses pointer events.
 * It listens on the window, because the pointer leaves the drag handle as
 * soon as the drag starts. It does not capture the pointer, so a click that
 * starts on the drag handle and ends on another control still reaches that
 * control.
 *
 * The drag starts only after the pointer moves a short distance. A pointer
 * down and up in the same place stays a click.
 *
 * @module ext.wikilambda.app.composables.useFragmentDrag
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { computed, onUnmounted, ref } = require( 'vue' );

const {
	changesOrder,
	getInsertionOffset,
	getInsertionPoint,
	getTargetIndex,
	passesDragThreshold
} = require( '../utils/dragUtils.js' );

/**
 * Composable that drives the drag of one fragment.
 *
 * @param {Object} options
 * @param {Function} options.getListRect - () => Object|null, rectangle of the list
 * @param {Function} options.getFragmentRects - () => Array<Object>, rectangles of the fragments
 * @param {Function} options.onDrop - ( fragmentIndex, targetIndex ) => undefined
 * @return {{
 *   isDragging: Object,
 *   draggedIndex: Object,
 *   insertionPoint: Object,
 *   insertionOffset: Object,
 *   startDrag: function(PointerEvent, number): undefined,
 *   cancelDrag: function(): undefined
 * }}
 */
module.exports = function useFragmentDrag( options ) {
	const { getListRect, getFragmentRects, onDrop } = options;

	// Position of the fragment that the user drags, or null outside a drag
	const draggedIndex = ref( null );
	// Position that the fragment goes before, or null when there is no target
	const insertionPoint = ref( null );
	const isDragging = ref( false );

	// Position of the pointer down, to measure the distance for the threshold
	let origin = null;
	let pointerId = null;

	// Distance from the top of the list to the line that shows the target
	const insertionOffset = computed( () => getInsertionOffset(
		insertionPoint.value,
		getListRect(),
		getFragmentRects()
	) );

	/**
	 * Stop listening for the pointer and clear the state of the drag.
	 *
	 * @return {undefined}
	 */
	function endDrag() {
		window.removeEventListener( 'pointermove', onPointerMove );
		window.removeEventListener( 'pointerup', onPointerUp );
		window.removeEventListener( 'pointercancel', onPointerCancel );
		window.removeEventListener( 'keydown', onKeyDown );

		draggedIndex.value = null;
		insertionPoint.value = null;
		isDragging.value = false;
		origin = null;
		pointerId = null;
	}

	/**
	 * Stop the drag and leave the fragments in their current order.
	 *
	 * @return {undefined}
	 */
	function cancelDrag() {
		endDrag();
	}

	/**
	 * Update the target position for the current pointer position.
	 * The drag starts when the pointer moves far enough from the pointer down.
	 *
	 * @param {PointerEvent} event
	 * @return {undefined}
	 */
	function onPointerMove( event ) {
		if ( pointerId !== null && event.pointerId !== pointerId ) {
			return;
		}

		const pointer = { x: event.clientX, y: event.clientY };

		if ( !isDragging.value ) {
			if ( !passesDragThreshold( origin, pointer ) ) {
				return;
			}
			isDragging.value = true;
		}

		// The pointer must not select the text of the fragments during a drag
		event.preventDefault();
		insertionPoint.value = getInsertionPoint( pointer, getListRect(), getFragmentRects() );
	}

	/**
	 * Move the fragment to the target position, if the drag started and the
	 * target changes the order of the fragments.
	 *
	 * @param {PointerEvent} event
	 * @return {undefined}
	 */
	function onPointerUp( event ) {
		if ( pointerId !== null && event.pointerId !== pointerId ) {
			return;
		}

		const fragmentIndex = draggedIndex.value;
		const target = insertionPoint.value;

		if ( isDragging.value && target !== null && changesOrder( target, fragmentIndex ) ) {
			onDrop( fragmentIndex, getTargetIndex( target, fragmentIndex ) );
		}

		endDrag();
	}

	/**
	 * Stop the drag when the browser takes the pointer, for example when a
	 * touch becomes a scroll.
	 *
	 * @param {PointerEvent} event
	 * @return {undefined}
	 */
	function onPointerCancel( event ) {
		if ( pointerId !== null && event.pointerId !== pointerId ) {
			return;
		}
		cancelDrag();
	}

	/**
	 * Stop the drag when the user presses Escape.
	 *
	 * @param {KeyboardEvent} event
	 * @return {undefined}
	 */
	function onKeyDown( event ) {
		if ( event.key === 'Escape' ) {
			cancelDrag();
		}
	}

	/**
	 * Start to watch the pointer for a drag of the fragment at the given
	 * position. The drag handle calls this on pointer down.
	 *
	 * @param {PointerEvent} event
	 * @param {number} fragmentIndex
	 * @return {undefined}
	 */
	function startDrag( event, fragmentIndex ) {
		// Only the primary button starts a drag
		if ( event.button !== undefined && event.button !== 0 ) {
			return;
		}

		endDrag();

		origin = { x: event.clientX, y: event.clientY };
		pointerId = event.pointerId === undefined ? null : event.pointerId;
		draggedIndex.value = fragmentIndex;

		window.addEventListener( 'pointermove', onPointerMove );
		window.addEventListener( 'pointerup', onPointerUp );
		window.addEventListener( 'pointercancel', onPointerCancel );
		window.addEventListener( 'keydown', onKeyDown );
	}

	// A component that goes away during a drag must not leave the listeners
	onUnmounted( () => {
		endDrag();
	} );

	return {
		isDragging,
		draggedIndex,
		insertionPoint,
		insertionOffset,
		startDrag,
		cancelDrag
	};
};
