/*!
 * Selection behaviour for an Abstract Content fragment, shared by the
 * definition column and the generated text column.
 *
 * A selection is different from a highlight. A highlight follows the pointer
 * and disappears when the pointer leaves. A selection stays until the user
 * selects another fragment or clears the selection.
 *
 * Each fragment component moves itself into view when it becomes the selected
 * fragment. Both columns do this, so the two columns do not have to know which
 * one the user used. `block: 'nearest'` moves the smallest possible distance,
 * so the column that the user clicked stays where it is, and only the other
 * column scrolls.
 *
 * @module ext.wikilambda.app.composables.useFragmentSelection
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { computed, onUnmounted, watch } = require( 'vue' );

const useMainStore = require( '../store/index.js' );

/**
 * Composable that tells a fragment component if it is selected, lets it become
 * the selected fragment, and moves it into view when it becomes selected.
 *
 * @param {Function} getKeyPath - () => string, the keyPath of this fragment
 * @param {Object} elementRef - Ref to the element to move into view
 * @return {{
 *   isSelected: Object,
 *   selectFragment: function(): undefined
 * }}
 */
module.exports = function useFragmentSelection( getKeyPath, elementRef ) {
	const store = useMainStore();

	const isSelected = computed( () => (
		!!getKeyPath() && store.getSelectedFragment === getKeyPath()
	) );

	/**
	 * Make this fragment the selected fragment.
	 *
	 * @return {undefined}
	 */
	function selectFragment() {
		store.setSelectedFragment( getKeyPath() );
	}

	/**
	 * Returns whether the user asked for less movement on the screen.
	 *
	 * @return {boolean}
	 */
	function prefersReducedMotion() {
		return !!( window.matchMedia &&
			window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches );
	}

	// Move this fragment into view when it becomes the selected fragment.
	// Use `flush: 'post'`, because the element must be in its final position
	// before it is measured.
	watch( isSelected, ( selected ) => {
		if ( !selected || !elementRef.value || !elementRef.value.scrollIntoView ) {
			return;
		}
		elementRef.value.scrollIntoView( {
			block: 'nearest',
			inline: 'nearest',
			behavior: prefersReducedMotion() ? 'auto' : 'smooth'
		} );
	}, { flush: 'post' } );

	// A fragment that goes away must not keep the selection, or the selection
	// points at a keyPath that no longer exists.
	onUnmounted( () => {
		if ( isSelected.value ) {
			store.setSelectedFragment( undefined );
		}
	} );

	return {
		isSelected,
		selectFragment
	};
};
