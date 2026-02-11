/*!
 * WikiLambda Vue references: useScrollLock composable
 *
 * @module ext.wikilambda.references.composables.useScrollLock
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
const { watch, onBeforeUnmount } = require( 'vue' );

/**
 * Composable to lock body scroll and prevent page jump.
 * Uses position: fixed technique (more reliable on iOS Safari).
 *
 * @param {Object} isActive - Vue ref/computed (boolean): when true, scroll is locked
 */
module.exports = function useScrollLock( isActive ) {
	/**
	 * Calculate the width of the browser's vertical scrollbar.
	 *
	 * Using window.innerWidth can be thrown off by horizontal overflow on the page,
	 * so measure using a temporary element instead.
	 *
	 * @return {number} Scrollbar width in pixels
	 */
	function getScrollbarWidth() {
		const root = document.documentElement;

		// If there's no vertical overflow, no scrollbar is visible.
		if ( root.scrollHeight <= root.clientHeight ) {
			return 0;
		}

		const measurement = document.createElement( 'div' );
		measurement.style.position = 'absolute';
		measurement.style.top = '-9999px';
		measurement.style.width = '100px';
		measurement.style.height = '100px';
		measurement.style.overflow = 'scroll';

		document.body.appendChild( measurement );
		const scrollbarWidth = measurement.offsetWidth - measurement.clientWidth;
		document.body.removeChild( measurement );

		return scrollbarWidth;
	}

	/**
	 * Lock the scroll.
	 */
	function lockScroll() {
		const body = document.body;
		const scrollbarWidth = getScrollbarWidth();

		if ( scrollbarWidth > 0 ) {
			body.style.paddingRight = `${ scrollbarWidth }px`;

		}

		body.style.overflow = 'hidden';
	}

	/**
	 * Unlock the scroll.
	 */
	function unlockScroll() {
		const body = document.body;
		body.style.removeProperty( 'overflow' );
		body.style.removeProperty( 'padding-right' );
	}

	watch( isActive, ( active ) => {
		if ( active ) {
			lockScroll();
		} else {
			unlockScroll();
		}
	}, { immediate: true } );

	onBeforeUnmount( () => {
		if ( isActive.value ) {
			unlockScroll();
		}
	} );
};
