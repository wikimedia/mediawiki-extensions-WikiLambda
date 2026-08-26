/*!
 * WikiLambda unit test suite for the ext.wikilambda.abstractpreview Test Kitchen reporter.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const testKitchen = require( '../../../resources/ext.wikilambda.abstractpreview/testKitchen.js' );

describe( 'ext.wikilambda.abstractpreview testKitchen', () => {
	let instrument;

	beforeEach( () => {
		instrument = mw.testKitchen.getInstrument();
	} );

	it( 'submits outcome, source and packed topicQid/locale to the base schema', () => {
		testKitchen.recordTestKitchenOutcome( 'incomplete', { locale: 'en', source: 'embedded' }, 'Q42' );

		expect( mw.testKitchen.getInstrument ).toHaveBeenCalledWith( 'aw-article-preview-completeness' );
		expect( instrument.setSchema ).toHaveBeenCalledWith( 'analytics/product_metrics/web/base' );
		expect( instrument.submitInteraction ).toHaveBeenCalledWith( 'preview_render', {
			action_subtype: 'incomplete',
			action_source: 'embedded',
			action_context: JSON.stringify( { topic_qid: 'Q42', locale: 'en' } )
		} );
	} );

	it( 'does nothing when Test Kitchen is not installed', () => {
		const originalTestKitchen = mw.testKitchen;
		delete mw.testKitchen;

		try {
			testKitchen.recordTestKitchenOutcome( 'complete', { locale: 'en', source: 'embedded' }, 'Q42' );

			expect( instrument.submitInteraction ).not.toHaveBeenCalled();
		} finally {
			mw.testKitchen = originalTestKitchen;
		}
	} );
} );
