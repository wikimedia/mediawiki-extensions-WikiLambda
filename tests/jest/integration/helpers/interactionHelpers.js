'use strict';

const awaitLookup = async ( wrapper ) => {
	// Fast-forward timer for API call.
	jest.runAllTimers();
	// CdxLookup requires no fewer than 3 ticks to fully update itself.
	await wrapper.vm.$nextTick();
	await wrapper.vm.$nextTick();
	await wrapper.vm.$nextTick();
};

const clickItemInMenu = ( parentWrapper, itemText ) =>
	parentWrapper.findAll( '.cdx-menu-item' )
		.find( ( item ) => item.text() === itemText )
		.trigger( 'click' );

const ticksUntilTrue = async ( wrapper, callback ) => {
	var ticksComplete = false;
	var tickCount = 0;
	while ( !ticksComplete && tickCount < 11 ) {
		await wrapper.vm.$nextTick();
		ticksComplete = callback();
		tickCount += 1;
	}
	if ( tickCount > 10 ) {
		throw new Error( 'Test waited for too many ticks: ' + tickCount );
	}
};

const pageChange = async ( wrapper ) => {
	const originalLocation = window.location.href.slice( 0 );
	await ticksUntilTrue( wrapper, () => originalLocation !== window.location.href );
};

module.exports = {
	awaitLookup: awaitLookup,
	clickItemInMenu: clickItemInMenu,
	ticksUntilTrue: ticksUntilTrue,
	pageChange: pageChange
};
