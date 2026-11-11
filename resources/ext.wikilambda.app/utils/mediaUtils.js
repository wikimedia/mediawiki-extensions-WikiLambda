/*!
 * WikiLambda Vue editor: media query utilities
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const mediaUtils = {
	/**
	 * Returns whether the screen matches the given media query.
	 *
	 * @param {string} query
	 * @return {boolean}
	 */
	matchesMedia: function ( query ) {
		return !!( window.matchMedia && window.matchMedia( query ).matches );
	},

	/**
	 * Returns whether the user asked for less movement on the screen.
	 *
	 * @return {boolean}
	 */
	prefersReducedMotion: function () {
		return mediaUtils.matchesMedia( '(prefers-reduced-motion: reduce)' );
	}
};

module.exports = mediaUtils;
