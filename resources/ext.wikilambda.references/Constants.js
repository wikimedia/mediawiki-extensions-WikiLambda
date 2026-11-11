/*!
 * WikiLambda references: Constants
 *
 * @module ext.wikilambda.references.Constants
 */
'use strict';

const Constants = {};

// Breakpoints (matching ext.wikilambda.app): the Codex @min-width-breakpoint-* tokens
Constants.BREAKPOINTS = {
	MOBILE: 320,
	TABLET: 640,
	DESKTOP: 1120,
	DESKTOP_WIDE: 1680
};
Constants.BREAKPOINT_TYPES = {
	MOBILE: 'MOBILE',
	TABLET: 'TABLET',
	DESKTOP: 'DESKTOP',
	DESKTOP_WIDE: 'DESKTOP_WIDE'
};

module.exports = Constants;
