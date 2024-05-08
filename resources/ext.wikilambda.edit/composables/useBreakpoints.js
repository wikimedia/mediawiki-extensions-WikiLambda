/**
 * WikiLambda Vue editor: useBreakpoints composable
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

module.exports = function useBreakpoints( breakpoints ) {
	const Vue = require( 'vue' );

	breakpoints = breakpoints || {};
	const windowWidth = Vue.ref( window.innerWidth );

	const onWidthChange = () => {
		windowWidth.value = window.innerWidth;
	};
	Vue.onMounted( () => {
		window.addEventListener( 'resize', onWidthChange );
	} );
	Vue.onUnmounted( () => {
		window.removeEventListener( 'resize', onWidthChange );
	} );

	// return the largest breakpoint as the current selected type
	const current = Vue.computed( () => {
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
			object[ breakpoint ] = Vue.computed( () => {
				return current.value === breakpoint;
			} );
			return object;
		}, {} );

	return Object.assign(
		{
			current: current
		},
		dynamicBreakpoints
	);
};
