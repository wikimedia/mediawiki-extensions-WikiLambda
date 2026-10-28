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
 * During the drag, the list opens a gap at the target for the dragged
 * fragment. The gap moves the fragments after it, so the composable keeps
 * the places of the fragments from the start of the drag, and it adds the
 * gap itself to find the target.
 *
 * @module ext.wikilambda.app.composables.useFragmentDrag
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { computed, nextTick, onUnmounted, ref } = require( 'vue' );

const {
	changesOrder,
	getInsertionOffset,
	getInsertionPoint,
	getScrollStep,
	placeRects,
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
 * @param {Function} [options.getGapHeight] - () => number, height of the gap at the target
 * @return {{
 *   isDragging: Object,
 *   draggedIndex: Object,
 *   insertionPoint: Object,
 *   isInPlace: Object,
 *   gapPoint: Object,
 *   gapShift: Object,
 *   insertionOffset: Object,
 *   startDrag: function(PointerEvent, number): undefined,
 *   cancelDrag: function(): undefined
 * }}
 */
module.exports = function useFragmentDrag( options ) {
	const { getListRect, getFragmentRects, onDrop } = options;
	const getGapHeight = options.getGapHeight || ( () => 0 );

	// Position of the fragment that the user drags, or null outside a drag
	const draggedIndex = ref( null );
	// Position that the fragment goes before, or null when there is no target
	const insertionPoint = ref( null );
	const isDragging = ref( false );

	// Position of the pointer down, to measure the distance for the threshold
	let origin = null;
	let pointerId = null;
	// Last position of the pointer during the drag, to update after a scroll
	let pointer = null;
	// Animation frame that scrolls the page, or null when the page stays
	let scrollFrame = null;
	// Places of the fragments when the drag started, from the top of the list
	let layout = [];

	// Whether a drop now leaves the fragment in its place. The two insertion
	// points next to the dragged fragment keep the order.
	const isInPlace = computed( () => insertionPoint.value !== null &&
		!changesOrder( insertionPoint.value, draggedIndex.value ) );

	// Position from which the fragments move down to open a gap for the ghost,
	// or null without a target. Over its old place, the dragged fragment gives
	// its own room to the ghost, so the gap opens after it.
	const gapPoint = computed( () => {
		if ( insertionPoint.value === null ) {
			return null;
		}
		return isInPlace.value ? draggedIndex.value + 1 : insertionPoint.value;
	} );

	// Distance that the fragments from the gap point move down. Over its old
	// place, the gap needs only the room that the old place does not give.
	const gapShift = computed( () => {
		const height = getGapHeight();
		if ( !isInPlace.value ) {
			return height;
		}
		const place = layout[ draggedIndex.value - 1 ];
		return Math.max( 0, height - ( place ? place.height : 0 ) );
	} );

	// Distance from the top of the list to the line that shows the target, and
	// to the ghost under it. Over its old place, the line is at the top of
	// that place. The fragments before the line do not move, so the layout
	// gives the distance.
	const insertionOffset = computed( () => getInsertionOffset(
		isInPlace.value ? draggedIndex.value : insertionPoint.value,
		{ top: 0 },
		isDragging.value ? layout : []
	) );

	/**
	 * Keep the places of the fragments, before the gap moves them.
	 *
	 * @return {undefined}
	 */
	function measureLayout() {
		const listRect = getListRect();
		layout = !listRect ? [] : getFragmentRects().map( ( rect ) => ( {
			top: rect.top - listRect.top,
			height: rect.height,
			left: rect.left,
			right: rect.right
		} ) );
	}

	/**
	 * Update the target position for the last pointer position, with the
	 * fragments where the user sees them. The pointer can stay in place while
	 * the page scrolls under it, so a scroll also calls this.
	 *
	 * @return {undefined}
	 */
	function update() {
		const listRect = getListRect();
		if ( !listRect ) {
			insertionPoint.value = null;
			return;
		}
		const rects = placeRects( layout, listRect.top, gapPoint.value, gapShift.value );
		insertionPoint.value = getInsertionPoint( pointer, listRect, rects );
	}

	/**
	 * Scroll the page one step while the pointer is near the top or the
	 * bottom edge of the viewport, and ask for the next step.
	 *
	 * @return {undefined}
	 */
	function scrollStep() {
		scrollFrame = null;
		if ( !isDragging.value || !pointer ) {
			return;
		}
		const step = getScrollStep( pointer.y, window.innerHeight );
		if ( step === 0 ) {
			return;
		}
		window.scrollBy( 0, step );
		update();
		scrollFrame = window.requestAnimationFrame( scrollStep );
	}

	/**
	 * Start to scroll the page, if it does not scroll already.
	 *
	 * @return {undefined}
	 */
	function startScroll() {
		if ( scrollFrame === null ) {
			scrollFrame = window.requestAnimationFrame( scrollStep );
		}
	}

	/**
	 * Swallow the click that the browser gives after the pointer up of a drag.
	 * Without this, the click selects the fragment under the pointer. The
	 * listener goes away after this task, so it cannot swallow a later click.
	 *
	 * @return {undefined}
	 */
	function suppressClick() {
		const swallow = ( event ) => {
			event.stopPropagation();
			event.preventDefault();
		};
		window.addEventListener( 'click', swallow, { capture: true, once: true } );
		setTimeout( () => {
			window.removeEventListener( 'click', swallow, { capture: true } );
		} );
	}

	/**
	 * Stop listening for the pointer and clear the state of the drag.
	 *
	 * @return {undefined}
	 */
	function endDrag() {
		window.removeEventListener( 'pointermove', onPointerMove );
		window.removeEventListener( 'pointerup', onPointerUp );
		window.removeEventListener( 'pointercancel', onPointerCancel );
		window.removeEventListener( 'keydown', onKeyDown, { capture: true } );
		window.removeEventListener( 'scroll', onScroll );
		window.removeEventListener( 'selectstart', onSelectStart );

		if ( scrollFrame !== null ) {
			window.cancelAnimationFrame( scrollFrame );
			scrollFrame = null;
		}

		draggedIndex.value = null;
		insertionPoint.value = null;
		isDragging.value = false;
		origin = null;
		pointerId = null;
		pointer = null;
		layout = [];
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

		const position = { x: event.clientX, y: event.clientY };

		if ( !isDragging.value ) {
			if ( !passesDragThreshold( origin, position ) ) {
				return;
			}
			measureLayout();
			isDragging.value = true;
			// The start of the drag collapses the dragged fragment, so measure
			// the places again when the page shows that
			nextTick( () => {
				if ( isDragging.value ) {
					measureLayout();
					update();
				}
			} );
		}

		// The pointer must not select the text of the fragments during a drag
		event.preventDefault();
		pointer = position;
		update();
		startScroll();
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
		const dragged = isDragging.value;

		if ( dragged && target !== null && changesOrder( target, fragmentIndex ) ) {
			onDrop( fragmentIndex, getTargetIndex( target, fragmentIndex ) );
		}

		endDrag();

		if ( dragged ) {
			suppressClick();
		}
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
	 * Stop the drag when the user presses Escape. The listener runs in the
	 * capture phase, so the Escape stops here during a drag: it must not
	 * also clear the fragment selection, which listens on the document.
	 *
	 * @param {KeyboardEvent} event
	 * @return {undefined}
	 */
	function onKeyDown( event ) {
		if ( event.key !== 'Escape' ) {
			return;
		}
		if ( isDragging.value ) {
			event.stopPropagation();
		}
		cancelDrag();
	}

	/**
	 * Stop a text selection while the pointer drags: the pointer moves over
	 * text, and it must not select it.
	 *
	 * @param {Event} event
	 * @return {undefined}
	 */
	function onSelectStart( event ) {
		event.preventDefault();
	}

	/**
	 * Follow the page when it scrolls during a drag, by the wheel or by the
	 * edge of the viewport.
	 *
	 * @return {undefined}
	 */
	function onScroll() {
		if ( isDragging.value && pointer ) {
			update();
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

		// The pointer down on the drag handle must not start a text selection
		// that grows as the pointer moves. A click on the handle stays a click.
		if ( typeof event.preventDefault === 'function' ) {
			event.preventDefault();
		}

		origin = { x: event.clientX, y: event.clientY };
		pointerId = event.pointerId === undefined ? null : event.pointerId;
		draggedIndex.value = fragmentIndex;

		window.addEventListener( 'pointermove', onPointerMove );
		window.addEventListener( 'pointerup', onPointerUp );
		window.addEventListener( 'pointercancel', onPointerCancel );
		window.addEventListener( 'keydown', onKeyDown, { capture: true } );
		window.addEventListener( 'scroll', onScroll, { passive: true } );
		window.addEventListener( 'selectstart', onSelectStart );
	}

	// A component that goes away during a drag must not leave the listeners
	onUnmounted( () => {
		endDrag();
	} );

	return {
		isDragging,
		draggedIndex,
		insertionPoint,
		isInPlace,
		gapPoint,
		gapShift,
		insertionOffset,
		startDrag,
		cancelDrag
	};
};
