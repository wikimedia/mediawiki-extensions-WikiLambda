/*!
 * WikiLambda unit test suite for the wikidataUtils util
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const wikidataUtils = require( '../../../resources/ext.wikilambda.app/utils/wikidataUtils.js' );

describe( 'wikidataUtils', () => {
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

	describe( 'extractWikidataItemIds', () => {
		it( 'extracts all Wikidata Item Qids', () => {
			const abstractContent = {
				qid: 'Q96807071',
				sections: {
					Q8776414: {
						index: 0,
						fragments: [
							'Z89',
							{
								Z1K1: 'Z7',
								Z7K1: 'Z444',
								Z444K1: { Z1K1: 'Z6091', Z6091K1: 'Q319' },
								Z444K2: { Z1K1: 'Z6091', Z6091K1: 'L3333' }
							}
						]
					}
				}
			};
			const expectedQids = [ 'Q96807071', 'Q8776414', 'Q319' ];
			expect( wikidataUtils.extractWikidataItemIds( abstractContent ) ).toEqual( expectedQids );
		} );
	} );

	describe( 'isWikidataQid', () => {
		it( 'returns false with undefined', () => {
			expect( wikidataUtils.isWikidataQid( undefined ) ).toBe( false );
		} );

		it( 'returns false with empty string', () => {
			expect( wikidataUtils.isWikidataQid( '' ) ).toBe( false );
		} );

		it( 'returns false with arbitrary string', () => {
			expect( wikidataUtils.isWikidataQid( 'banjo' ) ).toBe( false );
		} );

		it( 'returns true with another Wikidata id', () => {
			expect( wikidataUtils.isWikidataQid( 'L123456' ) ).toBe( false );
		} );

		it( 'returns true with Qid', () => {
			expect( wikidataUtils.isWikidataQid( 'Q123456' ) ).toBe( true );
		} );
	} );

	describe( 'isWikidataLexemeId', () => {
		it( 'returns false with undefined', () => {
			expect( wikidataUtils.isWikidataLexemeId( undefined ) ).toBe( false );
		} );

		it( 'returns false with empty string', () => {
			expect( wikidataUtils.isWikidataLexemeId( '' ) ).toBe( false );
		} );

		it( 'returns false with arbitrary string', () => {
			expect( wikidataUtils.isWikidataLexemeId( 'harmonica' ) ).toBe( false );
		} );

		it( 'returns true with another Wikidata id', () => {
			expect( wikidataUtils.isWikidataLexemeId( 'Q123456' ) ).toBe( false );
		} );

		it( 'returns true with Lexeme Id', () => {
			expect( wikidataUtils.isWikidataLexemeId( 'L123456' ) ).toBe( true );
		} );
	} );

	describe( 'isWikidataLexemeFormId', () => {
		it( 'returns false with undefined', () => {
			expect( wikidataUtils.isWikidataLexemeFormId( undefined ) ).toBe( false );
		} );

		it( 'returns false with empty string', () => {
			expect( wikidataUtils.isWikidataLexemeFormId( '' ) ).toBe( false );
		} );

		it( 'returns false with arbitrary string', () => {
			expect( wikidataUtils.isWikidataLexemeFormId( 'harmonica' ) ).toBe( false );
		} );

		it( 'returns true with another Wikidata id', () => {
			expect( wikidataUtils.isWikidataLexemeFormId( 'L123456' ) ).toBe( false );
		} );

		it( 'returns true with Lexeme Form Id', () => {
			expect( wikidataUtils.isWikidataLexemeFormId( 'L123456-F321' ) ).toBe( true );
		} );
	} );

	describe( 'isWikidataLexemeSenseId', () => {
		it( 'returns false with undefined', () => {
			expect( wikidataUtils.isWikidataLexemeSenseId( undefined ) ).toBe( false );
		} );

		it( 'returns false with empty string', () => {
			expect( wikidataUtils.isWikidataLexemeSenseId( '' ) ).toBe( false );
		} );

		it( 'returns false with arbitrary string', () => {
			expect( wikidataUtils.isWikidataLexemeSenseId( 'harmonica' ) ).toBe( false );
		} );

		it( 'returns true with another Wikidata id', () => {
			expect( wikidataUtils.isWikidataLexemeSenseId( 'L123456' ) ).toBe( false );
		} );

		it( 'returns true with Lexeme Sense Id', () => {
			expect( wikidataUtils.isWikidataLexemeSenseId( 'L123456-S321' ) ).toBe( true );
		} );
	} );

	describe( 'isWikidataPropertyId', () => {
		it( 'returns false with undefined', () => {
			expect( wikidataUtils.isWikidataPropertyId( undefined ) ).toBe( false );
		} );

		it( 'returns false with empty string', () => {
			expect( wikidataUtils.isWikidataPropertyId( '' ) ).toBe( false );
		} );

		it( 'returns false with arbitrary string', () => {
			expect( wikidataUtils.isWikidataPropertyId( 'harmonica' ) ).toBe( false );
		} );

		it( 'returns true with another Wikidata id', () => {
			expect( wikidataUtils.isWikidataPropertyId( 'Q123456' ) ).toBe( false );
		} );

		it( 'returns true with Property Id', () => {
			expect( wikidataUtils.isWikidataPropertyId( 'P123456' ) ).toBe( true );
		} );
	} );
} );
