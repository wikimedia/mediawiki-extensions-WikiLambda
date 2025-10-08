/*!
 * WikiLambda unit test suite for the useEventLog composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const useEventLog = require( '../../../resources/ext.wikilambda.app/composables/useEventLog.js' );

describe( 'useEventLog composable', () => {
	let eventLog;

	beforeEach( () => {
		const [ result ] = loadComposable( () => useEventLog() );
		eventLog = result;
		// Reset mock
		mw.eventLog.submitInteraction.mockClear();
	} );

	it( 'returns submitInteraction function', () => {
		expect( typeof eventLog.submitInteraction ).toBe( 'function' );
	} );

	it( 'submitInteraction calls eventLogUtils.submitInteraction', () => {
		const interactionData = {
			zobjecttype: 'Z8',
			action: 'save'
		};

		eventLog.submitInteraction( 'test-action', interactionData );

		expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith(
			'mediawiki.product_metrics.wikifunctions_ui',
			'/analytics/mediawiki/product_metrics/wikilambda/ui_actions/1.0.0',
			'test-action',
			{
				zobjecttype: 'Z8',
				action: 'save'
			}
		);
	} );

	it( 'submitInteraction handles null values', () => {
		const interactionData = {
			zobjecttype: 'Z8',
			action: 'save',
			nullValue: null
		};

		eventLog.submitInteraction( 'test-action', interactionData );

		expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith(
			'mediawiki.product_metrics.wikifunctions_ui',
			'/analytics/mediawiki/product_metrics/wikilambda/ui_actions/1.0.0',
			'test-action',
			{
				zobjecttype: 'Z8',
				action: 'save'
			}
		);
	} );
} );
