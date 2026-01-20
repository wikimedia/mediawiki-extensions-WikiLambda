/*!
 * WikiLambda references: Constants
 *
 * @module ext.wikilambda.references.Constants
 */
'use strict';

const Constants = {};

// Breakpoints (matching ext.wikilambda.app)
Constants.BREAKPOINTS = {
	MOBILE: 320,
	TABLET: 720,
	DESKTOP: 1000,
	DESKTOP_WIDE: 1200,
	DESKTOP_EXTRAWIDE: 2000
};
Constants.BREAKPOINT_TYPES = {
	MOBILE: 'MOBILE',
	TABLET: 'TABLET',
	DESKTOP: 'DESKTOP',
	DESKTOP_WIDE: 'DESKTOP_WIDE',
	DESKTOP_EXTRAWIDE: 'DESKTOP_EXTRAWIDE'
};

module.exports = Constants;
