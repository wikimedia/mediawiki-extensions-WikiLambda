/*!
 * WikiLambda Abstract Wikipedia preview: reader-facing completeness telemetry.
 *
 * Measures whether the Abstract Content actually shown to a reader was complete, on
 * every real pageview (including CDN/parser-cache hits, which the server-side
 * aw_preview_render_seconds outcome label misses since it only fires on a fresh
 * render).
 * Two DOM signals mark an incomplete render, both already emitted by PHP side:
 *  - <section data-wikilambda-aw-section-status="pending"> for a section missing
 *    from the store entirely (AWSection::emptyWikiSection);
 *  - <meta itemprop="aw-section-status" data-pending="N"> for a section that
 *    rendered but still has pending fragments (AWSection::appendStatusMetadata,
 *    written by the pre-generation maintenance script).
 *
 * The result is sent to two places: stats.* (Prometheus; aggregate ratio, no topicQid
 * for cardinality reasons) and Test Kitchen (broken down per topic).
 *
 * @module ext.wikilambda.abstractpreview
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const testKitchen = require( './testKitchen.js' );

/**
 * Whether the rendered preview has any section that is missing or still has
 * pending fragments.
 *
 * @memberof module:ext.wikilambda.abstractpreview
 * @return {boolean}
 */
function hasIncompleteSection() {
	return !!(
		document.querySelector( '[data-wikilambda-aw-section-status="pending"]' ) ||
		document.querySelector( 'meta[itemprop="aw-section-status"][data-pending]' )
	);
}

/**
 * Record reader-facing outcome to the stats.* (StatsFactory/Prometheus) pipeline.
 *
 * @memberof module:ext.wikilambda.abstractpreview
 * @param {string} outcome 'complete'|'incomplete'
 * @param {Object} config wgWikiLambda.abstractPreview config vars
 */
function recordStatsOutcome( outcome, config ) {
	mw.track( 'stats.mediawiki_WikiLambda_aw_preview_reader_outcome_total', 1, {
		outcome: outcome,
		locale: config.locale,
		source: config.source,
		// tag which wiki the pageview happened on:
		wiki: mw.config.get( 'wgDBname' )
	} );
}

/**
 * @memberof module:ext.wikilambda.abstractpreview
 */
function init() {
	const config = mw.config.get( 'wgWikiLambda' ) || {};
	const topicQid = config.abstractPreviewTopicQid;

	// return when no topic to measure
	if ( !topicQid ) {
		return;
	}

	// return when the page is a Special:PreviewAbstract page
	if ( config.abstractPreviewSource === 'special_page' ) {
		return;
	}

	const outcome = hasIncompleteSection() ? 'incomplete' : 'complete';
	const previewConfig = {
		locale: config.abstractPreviewLocale,
		source: config.abstractPreviewSource
	};

	recordStatsOutcome( outcome, previewConfig );
	testKitchen.recordTestKitchenOutcome( outcome, previewConfig, topicQid );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
