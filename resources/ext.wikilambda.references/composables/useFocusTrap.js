/*!
 * WikiLambda Vue references: useFocusTrap composable
 *
 * @module ext.wikilambda.references.composables.useFocusTrap
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { watch, onUnmounted, ref } = require( 'vue' );

const FOCUSABLE_SELECTORS = [
	'a[href]',
	'button:not([disabled])',
	'textarea:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'[tabindex]:not([tabindex="-1"])'
].join( ', ' );

/**
 * Generic focus-trap composable.
 * Focuses root element (should have tabindex="-1") and traps Tab/Shift+Tab.
 * Components should set tabindex="-1" on their root element.
 *
 * @param {Object} options
 * @param {Function} options.getRootEl Function returning the trap root HTMLElement (or null).
 * @param {Object} options.isActive Vue ref/computed (boolean): when true, trap is active.
 * @return {Object} { activate, deactivate, onKeydown, isAttached }
 */
module.exports = function useFocusTrap( options ) {
	const { getRootEl, isActive } = options;
	let attachedRoot = null;
	const isAttached = ref( false );

	/**
	 * Get all focusable elements within the root element.
	 *
	 * @param {HTMLElement} rootEl
	 * @return {HTMLElement[]}
	 */
	function getFocusableElements( rootEl ) {
		return Array.prototype.slice.call( rootEl.querySelectorAll( FOCUSABLE_SELECTORS ) )
			.filter( ( el ) => el.offsetWidth > 0 && el.offsetHeight > 0 );
	}

	function focusInitial() {
		setTimeout( () => {
			const rootEl = typeof getRootEl === 'function' ? getRootEl() : null;
			if ( !rootEl ) {
				return;
			}
			rootEl.focus();
		}, 0 );
	}

	/**
	 * Handle Tab/Shift+Tab keyboard events.
	 *
	 * @param {KeyboardEvent} e
	 */
	function onKeydown( e ) {
		if ( e.key !== 'Tab' ) {
			return;
		}

		const rootEl = typeof getRootEl === 'function' ? getRootEl() : null;
		if ( !rootEl ) {
			return;
		}

		// Only trap if focus is currently within the root element (including the root itself).
		const activeEl = document.activeElement;
		if ( activeEl && activeEl !== rootEl && !rootEl.contains( activeEl ) ) {
			return;
		}

		const focusables = getFocusableElements( rootEl );
		if ( focusables.length === 0 ) {
			// If no focusables, keep focus on root
			if ( document.activeElement !== rootEl ) {
				e.preventDefault();
				rootEl.focus();
			}
			return;
		}

		const first = focusables[ 0 ];
		const last = focusables[ focusables.length - 1 ];

		// If focus is on the root and user tabs forward, go to first focusable
		if ( document.activeElement === rootEl && !e.shiftKey ) {
			e.preventDefault();
			first.focus();
			return;
		}

		// If focus is on the root and user shift+tabs backward, go to last focusable
		if ( document.activeElement === rootEl && e.shiftKey ) {
			e.preventDefault();
			last.focus();
			return;
		}

		// If there is only one focusable element, keep focus on it.
		if ( first === last ) {
			e.preventDefault();
			first.focus();
			return;
		}

		// Trap at boundaries
		if ( e.shiftKey && document.activeElement === first ) {
			e.preventDefault();
			last.focus();
			return;
		}

		if ( !e.shiftKey && document.activeElement === last ) {
			e.preventDefault();
			first.focus();
		}
	}

	function detachListener() {
		if ( attachedRoot ) {
			attachedRoot.removeEventListener( 'keydown', onKeydown );
			attachedRoot = null;
			isAttached.value = false;
		}
	}

	function attachListener() {
		const rootEl = typeof getRootEl === 'function' ? getRootEl() : null;
		if ( !rootEl ) {
			return;
		}

		// Avoid double-attach if element re-renders
		if ( attachedRoot === rootEl ) {
			return;
		}

		detachListener();
		rootEl.addEventListener( 'keydown', onKeydown );
		attachedRoot = rootEl;
		isAttached.value = true;
	}

	function activate() {
		focusInitial();
		attachListener();
	}

	function deactivate() {
		detachListener();
	}

	// Watch activation and run after DOM updates/teleport are applied.
	watch( isActive, ( active ) => {
		if ( active ) {
			activate();
		} else {
			deactivate();
		}
	}, { flush: 'post' } );

	onUnmounted( () => {
		deactivate();
	} );

	return {
		activate,
		deactivate,
		isAttached,
		onKeydown
	};
};
