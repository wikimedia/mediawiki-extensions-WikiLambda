/*!
 * WikiLambda unit test suite for the Languages Vuex store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const languagesModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/languages.js' );

describe( 'Languages Vuex module', () => {
	describe( 'Getters', () => {
		describe( 'getUserLangCode', () => {
			it( 'should return the user language code as defined in wgWikiLambda config variables', () => {
				expect( languagesModule.getters.getUserLangCode() ).toBe( 'en' );
			} );
		} );

		describe( 'getUserLangZid', () => {
			it( 'should return the user language zid as defined in wgWikiLambda config variables', () => {
				expect( languagesModule.getters.getUserLangZid() ).toBe( 'Z1002' );
			} );
		} );

		describe( 'getUserRequestedLang', () => {
			it( 'should return the first requested user language code from the fallback chain', () => {
				mw.language.getFallbackLanguageChain = () => [ 'qqx', 'en' ];
				expect( languagesModule.getters.getUserRequestedLang() ).toBe( 'qqx' );

				mw.language.getFallbackLanguageChain = () => [ 'en' ];
				expect( languagesModule.getters.getUserRequestedLang() ).toBe( 'en' );
			} );
		} );

		describe( 'getFallbackLanguageZids', () => {
			beforeAll( () => {
				mw.language.getFallbackLanguageChain = () => [ 'ast', 'es', 'en' ];
			} );

			it( 'should return the whole array if language zids are available in the store', () => {
				const getters = {
					getLanguageZidOfCode: jest.fn().mockImplementation( ( code ) => {
						const zids = {
							ast: 'Z1732',
							es: 'Z1003',
							en: 'Z1002'
						};
						return zids[ code ];
					} )
				};
				const chain = languagesModule.getters.getFallbackLanguageZids( {}, getters );
				expect( chain ).toEqual( [ 'Z1732', 'Z1003', 'Z1002' ] );
			} );

			it( 'should return a partial array if not all language zids are available in the store', () => {
				const getters = {
					getLanguageZidOfCode: jest.fn().mockImplementation( ( code ) => {
						const zids = {
							es: 'Z1003',
							en: 'Z1002'
						};
						return zids[ code ];
					} )
				};
				const chain = languagesModule.getters.getFallbackLanguageZids( {}, getters );
				expect( chain ).toEqual( [ 'Z1003', 'Z1002' ] );
			} );

			it( 'should return an empty array if no language zids are available in the store', () => {
				const getters = {
					getLanguageZidOfCode: jest.fn().mockReturnValue( undefined )
				};
				const chain = languagesModule.getters.getFallbackLanguageZids( {}, getters );
				expect( chain ).toEqual( [] );
			} );
		} );
	} );
} );
