/*!
 * WikiLambda Abstract Wikipedia preview: reader-facing completeness telemetry.
 *
 * Measures whether the Abstract Content actually shown to a reader was complete, on
 * every real pageview (including CDN/parser-cache hits, which the server-side
 * aw_preview_render_seconds outcome label misses since it only fires on a fresh
 * render).
 * DOM signals mark an incomplete render, all already emitted by PHP side:
 *  - <section data-wikilambda-aw-section-status="pending"> for a section missing
 *    from the store entirely (AWSection::emptyWikiSection);
 *  - <meta itemprop="aw-section-status" data-pending/data-failed/data-stale="N">
 *    for a rendered section with pending, failed, or stale (outdated cache)
 *    fragments (AWSection::appendStatusMetadata).
 *    Stale means a cached response keeps getting served even after the section regenerates
 *    server-side; which aw_preview_render_seconds metric (fresh-render-only) cannot detect.
 *
 * The result is sent to two places: stats.* (Prometheus; aggregate ratio, no topicQid
 * for cardinality reasons) and Test Kitchen (broken down per topic).
 *
 * @module ext.wikilambda.abstractpreview
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const completeness = require( './completeness.js' );
const testKitchen = require( './testKitchen.js' );

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

	const outcome = completeness.hasIncompleteSection() ? 'incomplete' : 'complete';
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
