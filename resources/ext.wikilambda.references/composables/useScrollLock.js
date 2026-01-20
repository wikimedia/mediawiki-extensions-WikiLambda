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
 * @param {Object} options
 * @param {Object} options.isActive - Vue ref/computed (boolean): when true, scroll is locked
 */
module.exports = function useScrollLock( options ) {
	const { isActive } = options;
	let scrollPosition = 0;

	/**
	 * Get scrollbar width to compensate for layout shift.
	 *
	 * @return {number}
	 */
	function getScrollbarWidth() {
		return window.innerWidth - document.documentElement.clientWidth;
	}

	/**
	 * Lock the scroll.
	 */
	function lockScroll() {
		scrollPosition = window.scrollY;
		const body = document.body;
		const scrollbarWidth = getScrollbarWidth();
		if ( scrollbarWidth > 0 ) {
			body.style.paddingRight = `${ scrollbarWidth }px`;
		}

		body.style.overflow = 'hidden';
		body.style.position = 'fixed';
		body.style.top = `-${ scrollPosition }px`;
		body.style.width = '100%';
	}

	/**
	 * Unlock the scroll.
	 */
	function unlockScroll() {
		const body = document.body;

		body.style.removeProperty( 'overflow' );
		body.style.removeProperty( 'position' );
		body.style.removeProperty( 'top' );
		body.style.removeProperty( 'width' );
		body.style.removeProperty( 'padding-right' );

		window.scrollTo( 0, scrollPosition );
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
