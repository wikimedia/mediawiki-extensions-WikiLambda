/*!
 * Whether the two columns of an abstract article, the fragments and the
 * generated text, are stacked. They stack below desktop width.
 *
 * @module ext.wikilambda.app.composables.useStackedColumns
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { computed } = require( 'vue' );

const Constants = require( '../Constants.js' );
const useBreakpoints = require( './useBreakpoints.js' );

/**
 * @return {{ isStacked: Object }}
 */
module.exports = function useStackedColumns() {
	const breakpoint = useBreakpoints( Constants.BREAKPOINTS );

	const isStacked = computed( () => ![
		Constants.BREAKPOINT_TYPES.DESKTOP,
		Constants.BREAKPOINT_TYPES.DESKTOP_WIDE
	].includes( breakpoint.current.value ) );

	return { isStacked };
};
