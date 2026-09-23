/*!
 * WikiLambda unit test suite for the ext.wikilambda.abstractpreview Test Kitchen reporter.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { flushPromises } = require( '@vue/test-utils' );
const testKitchen = require( '../../../resources/ext.wikilambda.abstractpreview/testKitchen.js' );

describe( 'ext.wikilambda.abstractpreview testKitchen', () => {
	let instrument;

	beforeEach( () => {
		instrument = mw.testKitchen.getInstrument();
	} );

	it( 'waits for Test Kitchen to load, then sends outcome, source and packed topicQid/locale', async () => {
		testKitchen.recordTestKitchenOutcome( 'incomplete', { locale: 'en', source: 'embedded' }, 'Q42' );

		expect( mw.loader.using ).toHaveBeenCalledWith( [ 'ext.testKitchen' ] );
		expect( instrument.send ).not.toHaveBeenCalled();

		await flushPromises();

		expect( mw.testKitchen.getInstrument ).toHaveBeenCalledWith( 'aw-article-preview-completeness' );
		expect( instrument.setSchema ).not.toHaveBeenCalled();
		expect( instrument.send ).toHaveBeenCalledWith( 'preview_render', {
			action_subtype: 'incomplete',
			action_source: 'embedded',
			action_context: JSON.stringify( { topic_qid: 'Q42', locale: 'en' } )
		} );
	} );

	it( 'does nothing when Test Kitchen is not installed', async () => {
		// Use a jQuery promise like mw.loader.using bc the usual mockRejectedValueOnce
		// returns a normal promise, which fails this test bc our code doesn't catch it
		mw.loader.using.mockReturnValueOnce( $.Deferred().reject( new Error( 'Unknown module: ext.testKitchen' ) ).promise() );

		testKitchen.recordTestKitchenOutcome( 'complete', { locale: 'en', source: 'embedded' }, 'Q42' );
		await flushPromises();

		expect( instrument.send ).not.toHaveBeenCalled();
	} );
} );
