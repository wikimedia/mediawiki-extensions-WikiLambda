/*!
 * Initialize images in dynamically loaded HTML content.
 * Fires the MediaWiki hook that the image module listens to for broken-image recovery.
 *
 * @module ext.wikilambda.app.composables.useInitImages
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

/**
 * Composable to initialize image error handlers in a container element with v-html content.
 * Requires ext.wikilambda.image module to be loaded.
 *
 * @param {Object} contentRef - Vue ref to the container element
 * @return {{ initImages: function(): void }}
 */
module.exports = function useInitImages( contentRef ) {
	function initImages() {
		if ( !contentRef.value || typeof mw === 'undefined' || !mw.hook ) {
			return;
		}
		mw.hook( 'wikilambda.image.content' ).fire( contentRef.value );
	}
	return { initImages };
};
