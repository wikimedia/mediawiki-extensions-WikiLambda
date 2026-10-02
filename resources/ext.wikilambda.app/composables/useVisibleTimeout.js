/*!
 * WikiLambda Vue composable for a timeout that runs only while the page is visible
 *
 * @module ext.wikilambda.app.composables.useVisibleTimeout
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { onBeforeUnmount } = require( 'vue' );

/**
 * Composable that runs a callback once after a delay, but only while the page is visible.
 * If the page is hidden when the delay is over (e.g. in a background tab), the callback
 * waits until the page is visible again. The timeout stops when the component unmounts.
 *
 * @param {Function} callback
 * @param {number} delay Time (ms) to wait before running the callback
 * @return {Object} Timeout API: start and stop
 */
module.exports = function useVisibleTimeout( callback, delay ) {
	let timeoutId = null;

	/**
	 * Cancels the callback, while it waits for the delay or for the page to be visible.
	 */
	function stop() {
		clearTimeout( timeoutId );
		timeoutId = null;
		document.removeEventListener( 'visibilitychange', onVisibilityChange );
	}

	/**
	 * Runs the waiting callback when the page becomes visible again.
	 */
	function onVisibilityChange() {
		if ( !document.hidden ) {
			stop();
			callback();
		}
	}

	/**
	 * Starts the delay. If the delay already runs, starts it again.
	 */
	function start() {
		stop();
		timeoutId = setTimeout( () => {
			timeoutId = null;
			if ( document.hidden ) {
				// The page is hidden: wait until it is visible again
				document.addEventListener( 'visibilitychange', onVisibilityChange );
			} else {
				callback();
			}
		}, delay );
	}

	onBeforeUnmount( stop );

	return {
		start,
		stop
	};
};
