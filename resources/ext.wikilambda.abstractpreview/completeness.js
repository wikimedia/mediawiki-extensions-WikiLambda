/*!
 * WikiLambda Abstract Wikipedia preview: DOM detection of an incomplete render.
 *
 * @module ext.wikilambda.abstractpreview
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

/**
 * Whether the preview rendered has any section that is missing, failed to render,
 * or showing stale (outdated cache) content instead of a current render.
 *
 * @memberof module:ext.wikilambda.abstractpreview
 * @return {boolean}
 */
function hasIncompleteSection() {
	return !!(
		document.querySelector( '[data-wikilambda-aw-section-status="pending"]' ) ||
		document.querySelector( 'meta[itemprop="aw-section-status"][data-pending]' ) ||
		document.querySelector( 'meta[itemprop="aw-section-status"][data-failed]' ) ||
		document.querySelector( 'meta[itemprop="aw-section-status"][data-stale]' )
	);
}

module.exports = {
	hasIncompleteSection
};
