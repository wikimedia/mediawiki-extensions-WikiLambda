/*!
 * WikiLambda unit test suite for the Languages store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
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

		describe( 'getLanguageZidOfCode', () => {
			it( 'returns ZID from store when language is available in store', () => {
				store.languages = {
					en: 'Z1002',
					es: 'Z1003'
				};

				expect( store.getLanguageZidOfCode( 'en' ) ).toBe( 'Z1002' );
				expect( store.getLanguageZidOfCode( 'es' ) ).toBe( 'Z1003' );
			} );

			it( 'returns undefined when language not found in store or server mapping', () => {
				store.languages = {};

				expect( store.getLanguageZidOfCode( 'unknown' ) ).toBeUndefined();
				expect( store.getLanguageZidOfCode( 'xyz' ) ).toBeUndefined();
			} );
		} );

		describe( 'getFallbackLanguageZids', () => {
			beforeAll( () => {
				mw.language.getFallbackLanguageChain = () => [ 'ext', 'es', 'en' ];
			} );

			it( 'should return the whole array if language zids are available in the store', () => {
				Object.defineProperty( store, 'getLanguageZidOfCode', {
					value: jest.fn().mockImplementation( ( code ) => {
						const zids = {
							ext: 'Z1841',
							es: 'Z1003',
							en: 'Z1002'
						};
						return zids[ code ];
					} )
				} );
				expect( store.getFallbackLanguageZids ).toEqual( [ 'Z1841', 'Z1003', 'Z1002' ] );
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

	describe( 'Actions', () => {
		describe( 'setLanguageCode', () => {
			it( 'sets language zids indexed by language code', () => {
				store.languages = {};
				const payload = {
					code: 'en',
					zid: 'Z1002'
				};

				store.setLanguageCode( payload );
				expect( store.languages.en ).toEqual( 'Z1002' );
			} );
		} );

		describe( 'ensureLanguageCodes', () => {
			let getMock;

			beforeEach( () => {
				store.languages = {};
				store.languageCodeRequests = {};
				store.fetchZids = jest.fn().mockResolvedValue();
				getMock = jest.fn( ( params ) => {
					if ( params.action === 'query' && params.list === 'wikilambdaload_zlanguages' ) {
						const codes = Array.isArray( params.wikilambdaload_zlanguages_codes ) ?
							params.wikilambdaload_zlanguages_codes : [];
						return Promise.resolve( {
							query: {
								wikilambdaload_zlanguages: codes.map( ( code ) => ( {
									code,
									zid: code === 'es' ? 'Z1003' : ( code === 'fr' ? 'Z1004' : null )
								} ) )
							}
						} );
					}
					return Promise.resolve( {} );
				} );
				mw.Api = jest.fn( () => ( { get: getMock } ) );
			} );

			it( 'calls language_zids API and fetchZids with resolved zids', async () => {
				await store.ensureLanguageCodes( { codes: [ 'es' ] } );

				expect( getMock ).toHaveBeenCalledWith(
					expect.objectContaining( {
						action: 'query',
						list: 'wikilambdaload_zlanguages',
						format: 'json',
						formatversion: '2',
						wikilambdaload_zlanguages_codes: [ 'es' ]
					} ),
					expect.anything()
				);
				expect( store.languages.es ).toBe( 'Z1003' );
				expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z1003' ] } );
			} );

			it( 'skips API call when all codes already in state', async () => {
				store.languages = { es: 'Z1003' };

				await store.ensureLanguageCodes( { codes: [ 'es' ] } );

				expect( getMock ).not.toHaveBeenCalled();
				expect( store.fetchZids ).not.toHaveBeenCalled();
			} );

			it( 'dedupes codes and skips empty values before fetching', async () => {
				await store.ensureLanguageCodes( { codes: [ 'es', 'es', 'es', '', 'fr' ] } );

				// One API call with unique unknown codes [ 'es', 'fr' ]; '' filtered out
				expect( getMock ).toHaveBeenCalledTimes( 1 );
				expect( getMock ).toHaveBeenCalledWith(
					expect.objectContaining( { wikilambdaload_zlanguages_codes: [ 'es', 'fr' ] } ),
					expect.anything()
				);
			} );

			it( 'reuses in-flight requests for codes already being fetched', async () => {
				const inFlight = Promise.resolve();
				store.languageCodeRequests = { es: inFlight };

				await store.ensureLanguageCodes( { codes: [ 'es', 'fr' ] } );

				// Should only issue a single API call for the batch
				expect( getMock ).toHaveBeenCalledTimes( 1 );
			} );
		} );
	} );
} );
