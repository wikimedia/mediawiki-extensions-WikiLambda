/*!
 * Provenance popover of an Abstract Content fragment, shared by the generated
 * text column and the generated text under a fragment. (T441583)
 *
 * @module ext.wikilambda.app.composables.useFragmentProvenance
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { computed, onUnmounted, watch } = require( 'vue' );

const useMainStore = require( '../store/index.js' );

/**
 * Composable that tells a fragment component if the provenance popover is open
 * for its fragment, and closes the popover when the fragment changes or goes away.
 *
 * @param {Function} getKeyPath - () => string, the keyPath of this fragment
 * @param {Function} getFragmentHash - () => string|null, the hash of this fragment
 * @return {{
 *   isProvenanceOpen: Object,
 *   freshRequest: Object,
 *   onProvenanceOpenUpdate: function(boolean): undefined
 * }}
 */
module.exports = function useFragmentProvenance( getKeyPath, getFragmentHash ) {
	const store = useMainStore();

	const isProvenanceOpen = computed( () => store.getProvenanceFragment === getKeyPath() );

	// The state of a request to render this fragment again with the latest data (T441584)
	const freshRequest = computed( () => store.getFreshRequest(
		getFragmentHash(),
		store.getPreviewLanguageZid
	) );

	/**
	 * Close the provenance popover when Codex asks to, e.g. on a click
	 * outside it, the Escape key, or its close button.
	 *
	 * @param {boolean} open
	 */
	function onProvenanceOpenUpdate( open ) {
		if ( !open ) {
			store.setProvenanceFragment( undefined );
			// A failure message is about the moment it happened; do not show it next time
			store.clearFreshRequestError( getFragmentHash(), store.getPreviewLanguageZid );
		}
	}

	// The popover describes one render of the fragment: when the fragment
	// changes, the render it described is gone, so close the popover.
	watch( getFragmentHash, () => {
		if ( isProvenanceOpen.value ) {
			store.setProvenanceFragment( undefined );
		}
	} );

	// A fragment that goes away must not keep its popover open
	onUnmounted( () => {
		if ( isProvenanceOpen.value ) {
			store.setProvenanceFragment( undefined );
		}
	} );

	return {
		isProvenanceOpen,
		freshRequest,
		onProvenanceOpenUpdate
	};
};
