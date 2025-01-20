/*!
 * WikiLambda unit test suite for the Languages Vuex store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { setActivePinia, createPinia } = require( 'pinia' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'Languages Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
	} );

	describe( 'Getters', () => {
		describe( 'getUserLangCode', () => {
			it( 'should return the user language code as defined in wgWikiLambda config variables', () => {
				expect( store.getUserLangCode ).toBe( 'en' );
			} );
		} );

		describe( 'getUserLangZid', () => {
			it( 'should return the user language zid as defined in wgWikiLambda config variables', () => {
				expect( store.getUserLangZid ).toBe( 'Z1002' );
			} );
		} );

		describe( 'getUserRequestedLang', () => {
			it( 'should return the first requested user language code from the fallback chain when there are multiple values', () => {
				mw.language.getFallbackLanguageChain = jest.fn().mockReturnValueOnce( [ 'qqx', 'en' ] );
				expect( store.getUserRequestedLang ).toBe( 'qqx' );
			} );

			it( 'should return the first requested user language code from the fallback chain when there is 1 value', () => {
				mw.language.getFallbackLanguageChain = jest.fn().mockReturnValueOnce( [ 'en' ] );
				expect( store.getUserRequestedLang ).toBe( 'en' );
			} );
		} );

		describe( 'getFallbackLanguageZids', () => {
			beforeAll( () => {
				mw.language.getFallbackLanguageChain = () => [ 'ast', 'es', 'en' ];
			} );

			it( 'should return the whole array if language zids are available in the store', () => {
				Object.defineProperty( store, 'getLanguageZidOfCode', {
					value: jest.fn().mockImplementation( ( code ) => {
						const zids = {
							ast: 'Z1732',
							es: 'Z1003',
							en: 'Z1002'
						};
						return zids[ code ];
					} )
				} );
				expect( store.getFallbackLanguageZids ).toEqual( [ 'Z1732', 'Z1003', 'Z1002' ] );
			} );

			it( 'should return a partial array if not all language zids are available in the store', () => {
				Object.defineProperty( store, 'getLanguageZidOfCode', {
					value: jest.fn().mockImplementation( ( code ) => {
						const zids = {
							es: 'Z1003',
							en: 'Z1002'
						};
						return zids[ code ];
					} )
				} );
				expect( store.getFallbackLanguageZids ).toEqual( [ 'Z1003', 'Z1002' ] );
			} );

			it( 'should return an empty array if no language zids are available in the store', () => {
				Object.defineProperty( store, 'getLanguageZidOfCode', {
					value: jest.fn().mockReturnValue( undefined )
				} );
				expect( store.getFallbackLanguageZids ).toEqual( [] );
			} );
		} );
	} );
} );
