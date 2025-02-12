/*!
 * WikiLambda unit test suite for the wikidataUtils mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { methods: wikidataUtils } = require( '../../../resources/ext.wikilambda.app/mixins/wikidataUtils.js' );

describe( 'wikidataUtils mixin', () => {
	describe( 'extractWikidataLexemeIds', () => {
		it( 'extracts all Lexeme IDs', () => {
			const zobject = {
				Z1K1: 'Z2',
				Z2K1: { Z1K1: 'Z6', Z6K1: 'Z10033' },
				Z2K2: [ 'Z1',
					{
						Z1K1: 'Z7',
						Z7K1: 'Z6825',
						Z6825K1: { Z1K1: 'Z6095', Z6095K1: 'L296026' }
					},
					{
						Z1K1: 'Z6095',
						Z6095K1: 'L587336'
					},
					'L1161399'
				],
				Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
			};

			const expectedLids = [ 'L296026', 'L587336', 'L1161399' ];
			expect( wikidataUtils.extractWikidataLexemeIds( zobject ) ).toEqual( expectedLids );
		} );
	} );
} );
