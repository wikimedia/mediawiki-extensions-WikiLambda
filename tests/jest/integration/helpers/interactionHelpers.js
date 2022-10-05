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

module.exports = {
	awaitLookup: awaitLookup,
	clickItemInMenu: clickItemInMenu
};
