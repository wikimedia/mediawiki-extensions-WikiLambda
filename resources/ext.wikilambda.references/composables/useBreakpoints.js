/*!
 * WikiLambda references: useBreakpoints composable
 *
 * @module ext.wikilambda.references.composables.useBreakpoints
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = function useBreakpoints( breakpoints ) {
	const { ref, onMounted, onUnmounted, computed } = require( 'vue' );

	breakpoints = breakpoints || {};
	const windowWidth = ref( window.innerWidth );

	const onWidthChange = () => {
		windowWidth.value = window.innerWidth;
	};
	onMounted( () => {
		window.addEventListener( 'resize', onWidthChange );
	} );
	onUnmounted( () => {
		window.removeEventListener( 'resize', onWidthChange );
	} );

	// return the largest breakpoint as the current selected type
	const current = computed( () => {
		let currentType = Object.keys( breakpoints )[ 0 ] || null;
		for ( const breakpoint in breakpoints ) {
			if ( windowWidth.value >= breakpoints[ breakpoint ] ) {
				currentType = breakpoint;
			}
		}

		return currentType;
	} );

	// Dynamically creates a boolean value for each of the breakpoint
	const dynamicBreakpoints = Object.keys( breakpoints )
		.reduce( ( object, breakpoint ) => {
			object[ breakpoint ] = computed( () => current.value === breakpoint );
			return object;
		}, {} );

	return Object.assign(
		{
			current: current
		},
		dynamicBreakpoints
	);
};
