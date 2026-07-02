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
	let instrument;

	beforeEach( () => {
		const [ result ] = loadComposable( () => useEventLog() );
		eventLog = result;
		instrument = mw.testKitchen.getInstrument();
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

		expect( mw.testKitchen.getInstrument ).toHaveBeenCalledWith( 'wikifunctions-ui-actions' );
		expect( instrument.send ).toHaveBeenCalledWith(
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

		expect( instrument.send ).toHaveBeenCalledWith(
			'test-action',
			{
				zobjecttype: 'Z8',
				action: 'save'
			}
		);
	} );
} );
