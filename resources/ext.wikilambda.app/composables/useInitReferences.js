/*!
 * Initialize references in dynamically loaded HTML content.
 * Fires the MediaWiki hook that ReferenceManager listens to for reference initialization.
 *
 * @module ext.wikilambda.app.composables.useInitReferences
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { nextTick, ref } = require( 'vue' );

/**
 * Composable to initialize references in a container element with v-html content.
 * Requires ext.wikilambda.references module to be loaded.
 *
 * @return {{ contentRef: Object, initReferences: function(): void }}
 */
module.exports = function useInitReferences() {
	const contentRef = ref( null );

	function initReferences() {
		nextTick( () => {
			if ( !contentRef.value || typeof mw === 'undefined' || !mw.hook ) {
				return;
			}
			// Trigger custom hook that ReferenceManager in ext.wikilambda.references listens to
			// This allows references to be initialized in dynamically loaded content
			mw.hook( 'wikilambda.references.content' ).fire( contentRef.value );
		} );
	}

	return { contentRef, initReferences };
};
