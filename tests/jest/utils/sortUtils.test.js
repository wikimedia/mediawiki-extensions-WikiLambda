/*!
 * WikiLambda unit test suite for the sortUtils util
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const {
	sortLabelByLocale,
	createPropertyComparator,
	createLabelComparator
} = require( '../../../resources/ext.wikilambda.app/utils/sortUtils.js' );

describe( 'sortUtils', () => {
	describe( 'sortLabelByLocale', () => {
		it( 'sorts numeric suffixes naturally', () => {
			const keys = [ 'Z9999K10', 'Z9999K2', 'Z9999K1' ];

			const sorted = keys.sort( ( a, b ) => sortLabelByLocale( 'en', a, b ) );

			expect( sorted ).toEqual( [ 'Z9999K1', 'Z9999K2', 'Z9999K10' ] );
		} );

		it( 'treats case and accents as equivalent at base sensitivity', () => {
			expect( sortLabelByLocale( 'en', 'Résumé', 'resume' ) ).toBe( 0 );
		} );

		it( 'falls back to default locale when none is provided', () => {
			expect( () => sortLabelByLocale( undefined, 'Alpha', 'beta' ) ).not.toThrow();
			expect( sortLabelByLocale( undefined, 'Alpha', 'beta' ) ).toBeLessThan( 0 );
		} );
	} );

	describe( 'createPropertyComparator', () => {
		it( 'sorts objects by the provided property key', () => {
			const items = [
				{ label: 'Charlie' },
				{ label: 'alpha' },
				{ label: 'Bravo' }
			];
			const comparator = createPropertyComparator(
				( a, b ) => sortLabelByLocale( 'en', a, b ),
				'label'
			);

			const sorted = items.sort( comparator ).map( ( item ) => item.label );

			expect( sorted ).toEqual( [ 'alpha', 'Bravo', 'Charlie' ] );
		} );

		it( 'accepts a property extractor function', () => {
			const items = [
				{ meta: { label: 'gamma' } },
				{ meta: { label: 'beta' } },
				{ meta: { label: 'alpha' } }
			];
			const comparator = createPropertyComparator(
				( a, b ) => sortLabelByLocale( 'en', a, b ),
				( item ) => item.meta.label
			);

			const sorted = items.sort( comparator ).map( ( item ) => item.meta.label );

			expect( sorted ).toEqual( [ 'alpha', 'beta', 'gamma' ] );
		} );
	} );

	describe( 'createLabelComparator', () => {
		it( 'sorts using the default label key', () => {
			const inputs = [
				{ label: 'Z1K10' },
				{ label: 'Z1K2' },
				{ label: 'Z1K1' }
			];
			const comparator = createLabelComparator( 'en' );

			const sorted = inputs.sort( comparator ).map( ( input ) => input.label );

			expect( sorted ).toEqual( [ 'Z1K1', 'Z1K2', 'Z1K10' ] );
		} );

		it( 'sorts using a custom label extractor', () => {
			const inputs = [
				{ translation: { label: 'delta' } },
				{ translation: { label: 'beta' } },
				{ translation: { label: 'alpha' } }
			];
			const comparator = createLabelComparator(
				'en',
				( input ) => input.translation.label
			);

			const sorted = inputs.sort( comparator ).map( ( input ) => input.translation.label );

			expect( sorted ).toEqual( [ 'alpha', 'beta', 'delta' ] );
		} );
	} );
} );
