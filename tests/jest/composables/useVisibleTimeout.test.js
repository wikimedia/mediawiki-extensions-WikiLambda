/*!
 * WikiLambda unit test suite for the useVisibleTimeout composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const useVisibleTimeout = require( '../../../resources/ext.wikilambda.app/composables/useVisibleTimeout.js' );

describe( 'useVisibleTimeout', () => {
	let callback;
	let timeout;
	let wrapper;
	let isPageHidden;

	/**
	 * Sets whether the page is hidden, and sends the visibilitychange event.
	 *
	 * @param {boolean} hidden
	 */
	function setPageHidden( hidden ) {
		isPageHidden = hidden;
		document.dispatchEvent( new Event( 'visibilitychange' ) );
	}

	beforeEach( () => {
		jest.useFakeTimers();
		isPageHidden = false;
		Object.defineProperty( document, 'hidden', { configurable: true, get: () => isPageHidden } );

		callback = jest.fn();
		[ timeout, wrapper ] = loadComposable( () => useVisibleTimeout( callback, 1000 ) );
	} );

	afterEach( () => {
		wrapper.unmount();
		jest.useRealTimers();
		delete document.hidden;
	} );

	it( 'runs the callback once after the delay', () => {
		timeout.start();

		jest.advanceTimersByTime( 999 );
		expect( callback ).not.toHaveBeenCalled();

		jest.advanceTimersByTime( 1 );
		expect( callback ).toHaveBeenCalledTimes( 1 );

		jest.advanceTimersByTime( 5000 );
		expect( callback ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'does not run the callback after stop', () => {
		timeout.start();
		timeout.stop();

		jest.advanceTimersByTime( 5000 );
		expect( callback ).not.toHaveBeenCalled();
	} );

	it( 'starts the delay again when it starts again', () => {
		timeout.start();
		jest.advanceTimersByTime( 600 );
		timeout.start();
		jest.advanceTimersByTime( 600 );
		expect( callback ).not.toHaveBeenCalled();

		jest.advanceTimersByTime( 400 );
		expect( callback ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'waits until the page is visible if the page is hidden when the delay is over', () => {
		timeout.start();
		setPageHidden( true );

		jest.advanceTimersByTime( 5000 );
		expect( callback ).not.toHaveBeenCalled();

		// An event while the page is still hidden: keep waiting
		setPageHidden( true );
		expect( callback ).not.toHaveBeenCalled();

		setPageHidden( false );
		expect( callback ).toHaveBeenCalledTimes( 1 );

		// The callback runs only once
		setPageHidden( true );
		setPageHidden( false );
		expect( callback ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'runs at the normal time if the page is visible again before the delay is over', () => {
		timeout.start();
		setPageHidden( true );
		setPageHidden( false );
		expect( callback ).not.toHaveBeenCalled();

		jest.advanceTimersByTime( 1000 );
		expect( callback ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'does not run the callback if it stops while it waits for the page', () => {
		timeout.start();
		setPageHidden( true );
		jest.advanceTimersByTime( 1000 );

		timeout.stop();
		setPageHidden( false );
		expect( callback ).not.toHaveBeenCalled();
	} );

	it( 'does not run the callback after the component unmounts', () => {
		timeout.start();
		wrapper.unmount();

		jest.advanceTimersByTime( 5000 );
		expect( callback ).not.toHaveBeenCalled();
	} );

	it( 'stops waiting for the page when the component unmounts', () => {
		timeout.start();
		setPageHidden( true );
		jest.advanceTimersByTime( 1000 );

		wrapper.unmount();
		setPageHidden( false );
		expect( callback ).not.toHaveBeenCalled();
	} );
} );
