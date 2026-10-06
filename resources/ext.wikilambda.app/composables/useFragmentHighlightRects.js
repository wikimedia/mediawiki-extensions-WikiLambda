/*!
 * Compute highlight rectangles for the currently highlighted preview fragment.
 * Uses DOM Range and getClientRects() so the overlay adapts to inline, block,
 * and table content. Used by AbstractPreviewHighlightLayer.
 *
 * @module ext.wikilambda.app.composables.useFragmentHighlightRects
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { onBeforeUnmount, ref, watch } = require( 'vue' );

/**
 * Tell if two rectangles are on the same line. They must overlap vertically
 * by more than half of the shorter rectangle. A raised reference such as
 * "[2]" then joins its own line, and two lines that touch stay separate.
 *
 * @memberof module:ext.wikilambda.app.composables.useFragmentHighlightRects
 * @param {Object} a - Box with top and bottom
 * @param {Object} b - Box with top and bottom
 * @return {boolean}
 */
function isOnSameLine( a, b ) {
	const overlap = Math.min( a.bottom, b.bottom ) - Math.max( a.top, b.top );
	const smallerHeight = Math.min( a.bottom - a.top, b.bottom - b.top );
	return overlap > smallerHeight / 2;
}

/**
 * Join the client rectangles of a range into one box for each line.
 *
 * A range gives a rectangle for each text run and each element in it, and
 * the rectangles of an element and of its text overlap. Overlapped
 * translucent rectangles paint darker areas, so join them. A block, such
 * as a table, covers all the text in it, so it becomes one box.
 *
 * @memberof module:ext.wikilambda.app.composables.useFragmentHighlightRects
 * @param {Array<DOMRect>} clientRects
 * @return {Array<Object>} Boxes with top, left, bottom and right, in page order
 */
function mergeLineRects( clientRects ) {
	const boxes = [];

	for ( const r of clientRects ) {
		if ( !r.width || !r.height ) {
			continue;
		}

		let box = {
			top: r.top,
			left: r.left,
			bottom: r.top + r.height,
			right: r.left + r.width
		};

		// A box that grows can touch a box that it did not touch before,
		// so start again after each join.
		let i = 0;
		while ( i < boxes.length ) {
			if ( isOnSameLine( boxes[ i ], box ) ) {
				box = {
					top: Math.min( boxes[ i ].top, box.top ),
					left: Math.min( boxes[ i ].left, box.left ),
					bottom: Math.max( boxes[ i ].bottom, box.bottom ),
					right: Math.max( boxes[ i ].right, box.right )
				};
				boxes.splice( i, 1 );
				i = 0;
			} else {
				i++;
			}
		}
		boxes.push( box );
	}

	return boxes.sort( ( a, b ) => ( a.top - b.top ) || ( a.left - b.left ) );
}

/**
 * Composable that computes container-local rectangles for the highlighted fragment's
 * DOM nodes. Recomputes only when the highlighted keyPath changes (e.g. on hover).
 *
 * @param {Object} containerRef - Ref to the preview body container element
 * @param {Object} highlightedKeyPath - Ref or computed that yields the current highlighted fragment keyPath
 * @param {Function} getFragmentNodes - ( keyPath: string ) => Array<Node>|null
 * @return {{ rects: Object, updateRects: function(): undefined }}
 */
module.exports = function useFragmentHighlightRects( containerRef, highlightedKeyPath, getFragmentNodes ) {
	const rects = ref( [] );

	/**
	 * Recompute overlay rectangles for the current highlighted fragment.
	 *
	 * @return {undefined}
	 */
	function updateRects() {
		rects.value = [];

		if ( !containerRef || !containerRef.value || !highlightedKeyPath.value || !getFragmentNodes ) {
			return;
		}

		// A node that the page removed after the registration cannot be
		// a range boundary.
		const nodes = ( getFragmentNodes( highlightedKeyPath.value ) || [] )
			.filter( ( n ) => n.isConnected );

		if ( !nodes.length ) {
			return;
		}

		// Measure the full fragment, with its plain text, and not only its
		// elements. Otherwise only the links and the references get
		// the highlight.
		const range = document.createRange();
		range.setStartBefore( nodes[ 0 ] );
		range.setEndAfter( nodes[ nodes.length - 1 ] );
		const lineBoxes = mergeLineRects( Array.from( range.getClientRects() ) );

		const containerBox = containerRef.value.getBoundingClientRect();
		const newRects = [];
		const padding = 0;

		for ( let i = 0; i < lineBoxes.length; i++ ) {
			const box = lineBoxes[ i ];

			// Slightly inflate the rectangle so the highlight extends beyond
			// the element bounds (useful when the fragment is behind a table
			// or other content with its own background).
			let top = box.top - containerBox.top - padding;
			let left = box.left - containerBox.left - padding;
			let width = box.right - box.left + padding * 2;
			let height = box.bottom - box.top + padding * 2;

			if ( top < 0 ) {
				height += top;
				top = 0;
			}
			if ( left < 0 ) {
				width += left;
				left = 0;
			}

			newRects.push( {
				top: `${ top }px`,
				left: `${ left }px`,
				width: `${ width }px`,
				height: `${ height }px`
			} );
		}

		rects.value = newRects;
	}

	// Recompute when the highlighted fragment changes (e.g. on hover).
	watch( highlightedKeyPath, () => {
		updateRects();
	}, { flush: 'post' } );

	// A selected fragment keeps its rectangles for as long as the selection
	// stays, so the rectangles must follow the content when it moves. This
	// happens when the window changes size, when an image loads, or when a
	// fragment renders again. A hover highlight is too short to see this.
	let resizeObserver = null;

	// `containerRef` can be a plain null when the overlay has no container to
	// inject, and `watch` rejects that as a source.
	if ( containerRef ) {
		watch( containerRef, ( container ) => {
			if ( resizeObserver ) {
				resizeObserver.disconnect();
				resizeObserver = null;
			}
			if ( !container || typeof ResizeObserver !== 'function' ) {
				return;
			}
			resizeObserver = new ResizeObserver( () => {
				updateRects();
			} );
			resizeObserver.observe( container );
		}, { immediate: true } );
	}

	onBeforeUnmount( () => {
		if ( resizeObserver ) {
			resizeObserver.disconnect();
			resizeObserver = null;
		}
		rects.value = [];
	} );

	return {
		rects,
		updateRects
	};
};
