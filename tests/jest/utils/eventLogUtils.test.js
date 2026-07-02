/*!
 * WikiLambda unit test suite for the eventLogUtils utility.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const eventLogUtils = require( '../../../resources/ext.wikilambda.app/utils/eventLogUtils.js' );

describe( 'eventLogUtils', () => {
	describe( 'removeNullUndefined', () => {
		it( 'removes null values from object', () => {
			const result = eventLogUtils.removeNullUndefined( {
				key1: 'value1',
				key2: null,
				key3: 'value3'
			} );

			expect( result ).toEqual( {
				key1: 'value1',
				key3: 'value3'
			} );
		} );

		it( 'removes undefined values from object', () => {
			const result = eventLogUtils.removeNullUndefined( {
				key1: 'value1',
				key2: undefined,
				key3: 'value3'
			} );

			expect( result ).toEqual( {
				key1: 'value1',
				key3: 'value3'
			} );
		} );

		it( 'preserves false and 0 values', () => {
			const result = eventLogUtils.removeNullUndefined( {
				key1: false,
				key2: 0,
				key3: ''
			} );

			expect( result ).toEqual( {
				key1: false,
				key2: 0,
				key3: ''
			} );
		} );

		it( 'returns empty object for all null/undefined', () => {
			const result = eventLogUtils.removeNullUndefined( {
				key1: null,
				key2: undefined
			} );

			expect( result ).toEqual( {} );
		} );
	} );

	describe( 'submitInteraction', () => {
		let instrument;

		beforeEach( () => {
			instrument = mw.testKitchen.getInstrument();
		} );

		it( 'submits interaction event with cleaned data', () => {
			const interactionData = {
				zobjecttype: 'Z8',
				action: 'save',
				nullValue: null
			};

			eventLogUtils.submitInteraction( 'test-action', interactionData );

			expect( mw.testKitchen.getInstrument ).toHaveBeenCalledWith( 'wikifunctions-ui-actions' );
			expect( instrument.send ).toHaveBeenCalledWith(
				'test-action',
				{
					zobjecttype: 'Z8',
					action: 'save'
				}
			);
		} );

		it( 'converts non-string zobjecttype to string', () => {
			const interactionData = {
				zobjecttype: { Z1K1: 'Z8' }
			};

			eventLogUtils.submitInteraction( 'test-action', interactionData );

			expect( instrument.send ).toHaveBeenCalledWith(
				'test-action',
				{
					zobjecttype: JSON.stringify( { Z1K1: 'Z8' } )
				}
			);
		} );

		it( 'does not submit if mw.testKitchen is not available', () => {
			const originalTestKitchen = mw.testKitchen;
			delete mw.testKitchen;

			// Should not throw error
			eventLogUtils.submitInteraction( 'test-action', { data: 'test' } );

			// Restore
			mw.testKitchen = originalTestKitchen;

			expect( true ).toBe( true );
		} );

		it( 'does not mutate original interactionData object', () => {
			const interactionData = {
				zobjecttype: { Z1K1: 'Z8' },
				action: 'save'
			};
			const originalZobjecttype = interactionData.zobjecttype;

			eventLogUtils.submitInteraction( 'test-action', interactionData );

			// Original object should be mutated (zobjecttype converted to string)
			expect( interactionData.zobjecttype ).toBe( JSON.stringify( originalZobjecttype ) );
		} );
	} );
} );
