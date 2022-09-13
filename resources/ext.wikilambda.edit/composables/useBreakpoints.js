var Vue = require( 'vue' );

module.exports = function useBreakpoints( breakpoints ) {
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
		var currentType = Object.keys( breakpoints )[ 0 ] || null;
		for ( var breakpoint in breakpoints ) {
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

	return $.extend(
		{
			current: current
		},
		dynamicBreakpoints
	);
};
