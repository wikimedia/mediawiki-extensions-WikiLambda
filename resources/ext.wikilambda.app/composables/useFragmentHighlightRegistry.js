/*!
 * Registry for preview fragment DOM nodes used by the highlight overlay.
 * Each AbstractPreviewFragment registers the list of DOM nodes that belong
 * to its rendered HTML, keyed by its fragment keyPath. The highlight layer
 * looks them up to compute geometry.
 *
 * @module ext.wikilambda.app.composables.useFragmentHighlightRegistry
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

/**
 * Composable that provides a registry mapping fragment keyPaths to their DOM nodes.
 * Used by AbstractPreviewFragment to register nodes and by AbstractPreviewHighlightLayer
 * to compute highlight rectangles via useFragmentHighlightRects.
 *
 * @return {{
 *   registerFragmentNodes: function(string, Array<Node>): void,
 *   unregisterFragmentNodes: function(string): void,
 *   getFragmentNodes: function(string): Array<Node>|null
 * }}
 */
module.exports = function useFragmentHighlightRegistry() {
	const fragmentNodesByKeyPath = Object.create( null );

	/**
	 * Register the DOM nodes that belong to the given fragment keyPath.
	 *
	 * @param {string} keyPath
	 * @param {Array<Node>} nodes
	 * @return {undefined}
	 */
	function registerFragmentNodes( keyPath, nodes ) {
		if ( !keyPath ) {
			return;
		}
		fragmentNodesByKeyPath[ keyPath ] = Array.isArray( nodes ) ? nodes : [];
	}

	/**
	 * Unregister the DOM nodes for the given fragment keyPath.
	 *
	 * @param {string} keyPath
	 * @return {undefined}
	 */
	function unregisterFragmentNodes( keyPath ) {
		if ( !keyPath ) {
			return;
		}
		delete fragmentNodesByKeyPath[ keyPath ];
	}

	/**
	 * Get the DOM nodes currently registered for the given fragment keyPath.
	 *
	 * @param {string} keyPath
	 * @return {Array<Node>|null}
	 */
	function getFragmentNodes( keyPath ) {
		return fragmentNodesByKeyPath[ keyPath ] || null;
	}

	return {
		registerFragmentNodes,
		unregisterFragmentNodes,
		getFragmentNodes
	};
};
