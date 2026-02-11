/*!
 * Leave editor dialog composable for Vue 3 Composition API.
 * Handles navigation-away detection (link clicks, beforeunload) and shows
 * a confirmation dialog when the user tries to exit with unsaved changes.
 *
 * @module ext.wikilambda.app.composables.useLeaveEditorDialog
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { onBeforeUnmount, onMounted, ref } = require( 'vue' );
const urlUtils = require( '../utils/urlUtils.js' );

/**
 * Composable for leave-editor dialog when the user tries to exit with unsaved changes.
 * Handles link clicks, beforeunload, and LeaveEditorDialog state.
 *
 * @param {Object} options
 * @param {Object} options.isDirty - Reactive dirty state (Vue ref holding boolean, from store or computed)
 * @param {function(string): void} [options.onBeforeLeave] - Optional callback invoked before navigating
 *   when the user confirms discard (e.g. for event logging)
 * @return {Object} Composable API with showLeaveEditorDialog, leaveEditorCallback, closeLeaveDialog,
 *   removeListeners, leaveTo
 */
module.exports = function useLeaveEditorDialog( { isDirty, onBeforeLeave } ) {
	const leaveEditorCallback = ref( undefined );
	const showLeaveEditorDialog = ref( false );

	function closeLeaveDialog() {
		showLeaveEditorDialog.value = false;
	}

	/**
	 * Find an anchor element from a click target that would navigate away.
	 * Walks up the DOM from the target and checks if the link would leave the page.
	 *
	 * @param {Element} clickTarget - The element that was clicked
	 * @return {HTMLAnchorElement|undefined} The anchor element if it would navigate away, or undefined
	 */
	function findNavigationLink( clickTarget ) {
		let target = clickTarget;
		// If the click element is not a link, exit
		while ( target && target.tagName !== 'A' ) {
			target = target.parentNode;
			if ( !target ) {
				return;
			}
		}
		/**
		 * if the link:
		 * - doesn't have a target,
		 * - target property is _blank,
		 * - the link is to the current page, (usually when it's a hash link)
		 * - the link is a button
		 * we are staying in this page, so there's no need to handle cancelation
		 */
		if (
			!target.href ||
			target.target === '_blank' ||
			urlUtils.isLinkCurrentPath( target.href ) ||
			target.role === 'button'
		) {
			return;
		}
		// Else, abandon the page
		return target;
	}

	/**
	 * Handles navigation away from the page when clicking a link.
	 * Prevents accidental loss of work by showing confirmation when dirty.
	 *
	 * @param {Event} e the click event
	 */
	function handleClickAway( e ) {
		const link = findNavigationLink( e.target );
		if ( link ) {
			e.preventDefault();
			leaveTo( link.href );
		}
	}

	/**
	 * Handles browser beforeunload (close tab, refresh, etc.).
	 * Shows native browser dialog when there are unsaved changes.
	 *
	 * @param {Event} e the beforeunload event
	 */
	function handleUnload( e ) {
		if ( isDirty.value ) {
			e.preventDefault();
		}
	}

	/**
	 * Handle navigation away: show confirmation dialog if dirty,
	 * otherwise navigate immediately.
	 *
	 * @param {string} targetUrl
	 */
	function leaveTo( targetUrl ) {
		function leaveAction() {
			removeListeners();
			if ( onBeforeLeave ) {
				onBeforeLeave( targetUrl );
			}
			window.location.href = targetUrl;
		}

		if ( isDirty.value ) {
			leaveEditorCallback.value = leaveAction;
			showLeaveEditorDialog.value = true;
		} else {
			leaveAction();
		}
	}

	/**
	 * Add event listeners for click and beforeunload events.
	 */
	function addListeners() {
		window.addEventListener( 'click', handleClickAway );
		window.addEventListener( 'beforeunload', handleUnload );
	}

	/**
	 * Remove event listeners for click and beforeunload events.
	 */
	function removeListeners() {
		window.removeEventListener( 'click', handleClickAway );
		window.removeEventListener( 'beforeunload', handleUnload );
	}

	onMounted( () => {
		addListeners();
	} );

	onBeforeUnmount( () => {
		removeListeners();
	} );

	return {
		closeLeaveDialog,
		leaveEditorCallback,
		removeListeners,
		showLeaveEditorDialog,
		leaveTo
	};
};
