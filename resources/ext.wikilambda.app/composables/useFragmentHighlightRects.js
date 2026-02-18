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

		const nodes = getFragmentNodes( highlightedKeyPath.value );

		if ( !nodes || !nodes.length ) {
			return;
		}

		const containerBox = containerRef.value.getBoundingClientRect();
		const newRects = [];
		const padding = 0;

		// Use only element nodes so we don't get extra rects for text nodes
		// (e.g. whitespace between <sup> elements that would create a strange middle bump).
		const elementNodes = nodes.filter( ( n ) => n.nodeType === 1 );

		// Rendered fragment can be plain text (no elements); then use the container's bounds.
		const elementsToMeasure = elementNodes.length > 0 ?
			elementNodes :
			( nodes[ 0 ].parentElement ? [ nodes[ 0 ].parentElement ] : [] );

		for ( let i = 0; i < elementsToMeasure.length; i++ ) {
			const el = elementsToMeasure[ i ];
			const r = el.getBoundingClientRect();

			if ( !r.width || !r.height ) {
				continue;
			}

			// Slightly inflate the rectangle so the highlight extends beyond
			// the element bounds (useful when the fragment is behind a table
			// or other content with its own background).
			let top = r.top - containerBox.top - padding;
			let left = r.left - containerBox.left - padding;
			let width = r.width + padding * 2;
			let height = r.height + padding * 2;

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

	onBeforeUnmount( () => {
		rects.value = [];
	} );

	return {
		rects,
		updateRects
	};
};
