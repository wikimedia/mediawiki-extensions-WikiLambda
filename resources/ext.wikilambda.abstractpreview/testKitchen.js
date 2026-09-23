/*!
 * WikiLambda Abstract Wikipedia preview: Test Kitchen reporting for reader-facing
 * completeness telemetry. See init.js for the stats.* (Prometheus) counterpart.
 *
 * @module ext.wikilambda.abstractpreview
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

// Test Kitchen instrument name, per the aw-article-preview-completeness measurement plan.
// No need to call setSchema() because Test Kitchen already uses the latest base schema by default.
const TK_INSTRUMENT_NAME = 'aw-article-preview-completeness';

/**
 * Records reader-facing outcome to Test Kitchen, with topicQid attached so results can be
 * broken down per topic (whereas stats.* omits topicQid to keep Prometheus label
 * cardinality bounded). Does nothing if Test Kitchen isn't installed on this wiki.
 *
 * Maps to the base schema per the measurement plan: outcome/source ride action_subtype/
 * action_source; topicQid/locale are packed as JSON into action_context (no dedicated fields).
 *
 * @memberof module:ext.wikilambda.abstractpreview
 * @param {string} outcome 'complete'|'incomplete'
 * @param {Object} config wgWikiLambda.abstractPreview config vars
 * @param {string} topicQid
 */
function recordTestKitchenOutcome( outcome, config, topicQid ) {
	mw.loader.using( [ 'ext.testKitchen' ] ).then( () => {
		mw.testKitchen.getInstrument( TK_INSTRUMENT_NAME ).send( 'preview_render', {
			// eslint-disable-next-line camelcase
			action_subtype: outcome,
			// eslint-disable-next-line camelcase
			action_source: config.source,
			// eslint-disable-next-line camelcase
			action_context: JSON.stringify( {
				// eslint-disable-next-line camelcase
				topic_qid: topicQid,
				locale: config.locale
			} )
		} );
	} );
}

module.exports = {
	recordTestKitchenOutcome
};
