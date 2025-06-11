/*!
 * WikiLambda unit test suite for the library Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const LabelData = require( '../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { mockApiResponseFor, mockStoredObjects, mockEnumValues } = require( '../../fixtures/mocks.js' );

const mockLabels = {
	Z1: new LabelData( 'Z1', 'Object', 'Z1002' ),
	Z6: new LabelData( 'Z6', 'String', 'Z1002' )
};

describe( 'library Pinia store', () => {
	let store, getMock, searchFunctionsGetMock;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.labels = {};
		store.objects = {};
		store.requests = {};
		store.enums = {};
		store.languages = {};
		getMock = jest.fn().mockResolvedValue( mockApiResponseFor( [ 'Z1', 'Z2', 'Z6' ] ) );
		searchFunctionsGetMock = jest.fn().mockResolvedValue( {
			query: {
				wikilambdasearch_functions: [
					{ page_title: 'Z100', label: 'Test Function' }
				]
			}
		} );
		mw.Api = jest.fn( () => ( {
			get: jest.fn( ( params ) => {
				if ( params.list === 'wikilambdasearch_functions' ) {
					return searchFunctionsGetMock( params );
				}
				return getMock( params );
			} )
		} ) );
	} );

	describe( 'Getters', () => {

		beforeEach( () => {
			global.$.uls = { data: { getDir: jest.fn( () => 'ltr' ) } };
		} );

		describe( 'getLabelData', () => {
			it( 'Returns untitled LabelData if label is not available in the state', () => {
				const labelData = store.getLabelData( 'Z10000' );

				expect( labelData.zid ).toEqual( 'Z10000' );
				expect( labelData.label ).toEqual( 'Z10000' );
				expect( labelData.isUntitled ).toBe( true );
				expect( labelData.labelOrUntitled ).toBe( 'Untitled' );

				// Language info
				expect( labelData.isUserLang ).toBe( false );
				expect( labelData.isFallbackLang ).toBe( false );
			} );

			it( 'Returns the label data if userlang is available in the state', () => {
				store.labels = mockLabels;
				Object.defineProperty( store, 'getLanguageIsoCodeOfZLang', {
					value: jest.fn().mockReturnValue( 'en' )
				} );

				mw.language.getFallbackLanguageChain = () => [ 'en' ];

				const labelData = store.getLabelData( 'Z6' );

				expect( labelData.zid ).toEqual( 'Z6' );
				expect( labelData.label ).toEqual( 'String' );
				expect( labelData.isUntitled ).toBe( false );
				expect( labelData.labelOrUntitled ).toBe( 'String' );

				// Language info
				expect( labelData.lang ).toBe( 'Z1002' );
				expect( labelData.langCode ).toBe( 'en' );
				expect( labelData.langDir ).toBe( 'ltr' );
				expect( labelData.isUserLang ).toBe( true );
				expect( labelData.isFallbackLang ).toBe( true );
			} );

			it( 'Returns the label data if fallback lang is available in the state', () => {
				store.labels = mockLabels;
				Object.defineProperty( store, 'getLanguageIsoCodeOfZLang', {
					value: jest.fn().mockReturnValue( 'en' )
				} );

				mw.language.getFallbackLanguageChain = () => [ 'es', 'en' ];

				const labelData = store.getLabelData( 'Z6' );

				expect( labelData.zid ).toEqual( 'Z6' );
				expect( labelData.label ).toEqual( 'String' );
				expect( labelData.isUntitled ).toBe( false );
				expect( labelData.labelOrUntitled ).toBe( 'String' );

				// Language info
				expect( labelData.lang ).toBe( 'Z1002' );
				expect( labelData.langCode ).toBe( 'en' );
				expect( labelData.langDir ).toBe( 'ltr' );
				expect( labelData.isUserLang ).toBe( false );
				expect( labelData.isFallbackLang ).toBe( true );
			} );

			it( 'Returns the label data if other than fallback lang is available in the state', () => {
				store.labels = mockLabels;
				Object.defineProperty( store, 'getLanguageIsoCodeOfZLang', {
					value: jest.fn().mockReturnValue( 'en' )
				} );

				mw.language.getFallbackLanguageChain = () => [ 'es' ];

				const labelData = store.getLabelData( 'Z6' );

				expect( labelData.zid ).toEqual( 'Z6' );
				expect( labelData.label ).toEqual( 'String' );
				expect( labelData.isUntitled ).toBe( false );
				expect( labelData.labelOrUntitled ).toBe( 'String' );

				// Language info
				expect( labelData.lang ).toBe( 'Z1002' );
				expect( labelData.langCode ).toBe( 'en' );
				expect( labelData.langDir ).toBe( 'ltr' );
				expect( labelData.isUserLang ).toBe( false );
				expect( labelData.isFallbackLang ).toBe( false );
			} );

			it( 'Returns raw zids when the requested language is qqx', () => {
				store.labels = mockLabels;
				mw.language.getFallbackLanguageChain = () => [ 'qqx', 'en' ];

				const labelData = store.getLabelData( 'Z6' );

				expect( labelData.zid ).toEqual( 'Z6' );
				expect( labelData.label ).toEqual( '(Z6)' );
				expect( labelData.isUntitled ).toBe( false );
				expect( labelData.labelOrUntitled ).toBe( '(Z6)' );
			} );
		} );

		describe( 'getStoredObject', () => {
			it( 'Returns undefined if the zid is not available in the state', () => {
				expect( store.getStoredObject( 'Z10000' ) ).toEqual( undefined );
			} );

			it( 'Returns the whole object if available in the state', () => {
				store.objects = mockStoredObjects;
				expect( store.getStoredObject( 'Z6' ) ).toEqual( mockStoredObjects.Z6.data );
			} );
		} );

		describe( 'getExpectedTypeOfKey', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
			} );

			it( 'Returns Z_PERSISTENTOBJECT if the key is undefined', () => {
				expect( store.getExpectedTypeOfKey( undefined ) ).toEqual( Constants.Z_PERSISTENTOBJECT );
			} );

			it( 'Returns Z_OBJECT if the key is local', () => {
				expect( store.getExpectedTypeOfKey( 'K1' ) ).toEqual( Constants.Z_OBJECT );
			} );

			it( 'Returns Z_OBJECT if the key is not found', () => {
				expect( store.getExpectedTypeOfKey( 'Z10000K1' ) ).toEqual( Constants.Z_OBJECT );
			} );

			it( 'Returns the terminal type of a global key', () => {
				expect( store.getExpectedTypeOfKey( 'Z6K1' ) ).toEqual( Constants.Z_STRING );
			} );

			it( 'Returns the generic type of a global key', () => {
				const expected = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_LIST,
					Z881K1: Constants.Z_STRING
				};
				expect( store.getExpectedTypeOfKey( 'Z31K2' ) ).toEqual( expected );
			} );

			it( 'Returns the argument type of a key if the zid is that of a function', () => {
				expect( store.getExpectedTypeOfKey( 'Z881K1' ) ).toEqual( Constants.Z_TYPE );
			} );

			it( 'Returns Z_OBJECT if the key is not from a type or a function', () => {
				expect( store.getExpectedTypeOfKey( 'Z10001K1' ) ).toEqual( Constants.Z_OBJECT );
			} );
		} );

		describe( 'isIdentityKey', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
			} );

			it( 'returns false if the key is undefined', () => {
				expect( store.isIdentityKey( undefined ) ).toBe( false );
			} );

			it( 'returns false if the key is local', () => {
				expect( store.isIdentityKey( 'K1' ) ).toBe( false );
			} );

			it( 'returns false if the key is of a typed list item', () => {
				expect( store.isIdentityKey( '1' ) ).toBe( false );
			} );

			it( 'returns false if the key is unknown', () => {
				expect( store.isIdentityKey( 'Z1234K567' ) ).toBe( false );
			} );

			it( 'returns false if the key is not a type key', () => {
				expect( store.isIdentityKey( 'Z881K1' ) ).toBe( false );
			} );

			it( 'returns false if the key has no is identity/Z3K4 key', () => {
				expect( store.isIdentityKey( 'Z20007K1' ) ).toBe( false );
			} );

			it( 'returns false if the key has is identity/Z3K4 key set to false', () => {
				expect( store.isIdentityKey( 'Z20007K2' ) ).toBe( false );
			} );

			it( 'returns true if the key has is identity/Z3K4 key set to ref(true)', () => {
				expect( store.isIdentityKey( 'Z20007K3' ) ).toBe( true );
			} );

			it( 'returns true if the key has is identity/Z3K4 key set to boolean(true)', () => {
				expect( store.isIdentityKey( 'Z20007K4' ) ).toBe( true );
			} );
		} );

		describe( 'getLanguageIsoCodeOfZLang', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
			} );

			it( 'Returns the language zid if the object has not been fetched', () => {
				expect( store.getLanguageIsoCodeOfZLang( 'Z1002' ) ).toEqual( 'Z1002' );
			} );

			it( 'Returns the zid if it is of the wrong type', () => {
				expect( store.getLanguageIsoCodeOfZLang( 'Z6' ) ).toEqual( 'Z6' );
			} );

			it( 'Returns the language ISO code if available', () => {
				expect( store.getLanguageIsoCodeOfZLang( 'Z1003' ) ).toEqual( 'es' );
			} );
		} );

		describe( 'getConnectedObjects', () => {
			it( 'Returns empty array if the zid is not available in the state', () => {
				expect( store.getConnectedObjects( 'Z802', Constants.Z_FUNCTION_IMPLEMENTATIONS ) ).toEqual( [] );
			} );

			it( 'Returns empty array if the zid is not of a function', () => {
				store.objects = mockStoredObjects;
				expect( store.getConnectedObjects( 'Z6', Constants.Z_FUNCTION_IMPLEMENTATIONS ) ).toEqual( [] );
			} );

			it( 'Returns array with the implementations of a given function', () => {
				store.objects = mockStoredObjects;
				expect( store.getConnectedObjects( 'Z802', Constants.Z_FUNCTION_IMPLEMENTATIONS ) ).toEqual( [ 'Z902' ] );
			} );

			it( 'Returns array with the tests of a given function', () => {
				store.objects = mockStoredObjects;
				expect( store.getConnectedObjects( 'Z802', Constants.Z_FUNCTION_TESTERS ) ).toEqual( [ 'Z8020', 'Z8021' ] );
			} );

			it( 'Returns empty array if key not valid', () => {
				store.objects = mockStoredObjects;
				expect( store.getConnectedObjects( 'Z802' ) ).toEqual( [] );
			} );
		} );

		describe( 'getInputsOfFunctionZid', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
			} );

			it( 'Returns empty array when the zid has not been fetched', () => {
				expect( store.getInputsOfFunctionZid( 'Z999999' ) ).toHaveLength( 0 );
			} );

			it( 'Returns empty array when the zid is not a function', () => {
				expect( store.getInputsOfFunctionZid( 'Z32' ) ).toHaveLength( 0 );
			} );

			it( 'Returns one argument with a one-argument function', () => {
				const args = store.getInputsOfFunctionZid( 'Z881' );
				expect( args ).toHaveLength( 1 );
				expect( args[ 0 ].Z17K2 ).toEqual( 'Z881K1' );
			} );

			it( 'Returns all arguments with a three-argument function', () => {
				const args = store.getInputsOfFunctionZid( 'Z802' );
				expect( args ).toHaveLength( 3 );
				expect( args[ 0 ].Z17K2 ).toEqual( 'Z802K1' );
				expect( args[ 1 ].Z17K2 ).toEqual( 'Z802K2' );
				expect( args[ 2 ].Z17K2 ).toEqual( 'Z802K3' );
			} );
		} );

		describe( 'getFunctionZidOfImplementation', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
			} );

			it( 'returns undefined if the implementation is not found', () => {
				const zid = 'Z20055';
				const expected = undefined;
				const actual = store.getFunctionZidOfImplementation( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'returns undefined if the object is not an implementation', () => {
				const zid = 'Z6';
				const expected = undefined;
				const actual = store.getFunctionZidOfImplementation( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'returns function zid of the implementation', () => {
				const zid = 'Z20005';
				const expected = 'Z20000';
				const actual = store.getFunctionZidOfImplementation( zid );
				expect( actual ).toBe( expected );
			} );
		} );

		describe( 'getTypeOfImplementation', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
			} );

			it( 'returns undefined if the implementation is not found', () => {
				const zid = 'Z20055';
				const expected = undefined;
				const actual = store.getTypeOfImplementation( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'returns undefined if the object is not an implementation', () => {
				const zid = 'Z6';
				const expected = undefined;
				const actual = store.getTypeOfImplementation( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'returns type of code implementation', () => {
				const zid = 'Z20005';
				const expected = 'Z14K3';
				const actual = store.getTypeOfImplementation( zid );
				expect( actual ).toEqual( expected );
			} );
		} );

		describe( 'getLanguageOfImplementation', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
			} );

			it( 'gets language of a code implementation', () => {
				const zid = 'Z20005';
				const expected = 'Z600';
				const actual = store.getLanguageOfImplementation( zid );
				expect( actual ).toBe( expected );
			} );
		} );

		describe( 'isEnumType', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
			} );

			it( 'returns false when zid is undefined', () => {
				const zid = undefined;
				const expected = false;
				const actual = store.isEnumType( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'returns false when zid is in the excluded from enums list', () => {
				const zid = 'Z8';
				const expected = false;
				const actual = store.isEnumType( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'returns false when zid is not available', () => {
				const zid = 'Z50000';
				const expected = false;
				const actual = store.isEnumType( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'returns false when zid is not a type', () => {
				const zid = 'Z802';
				const expected = false;
				const actual = store.isEnumType( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'returns false when type is not enum', () => {
				const zid = 'Z3';
				const expected = false;
				const actual = store.isEnumType( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'returns true when type is enum', () => {
				const zid = 'Z30000';
				const expected = true;
				const actual = store.isEnumType( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'returns true when type is Boolean', () => {
				const zid = 'Z40';
				const expected = true;
				const actual = store.isEnumType( zid );
				expect( actual ).toBe( expected );
			} );

			describe( 'isCustomEnum', () => {
				beforeEach( () => {
					store.objects = mockStoredObjects;
					Object.defineProperty( store, 'isEnumType', {
						value: jest.fn().mockReturnValue( true )
					} );
				} );

				it( 'returns true when type is custom enum', () => {
					const zid = 'Z30000';
					const expected = true;
					const actual = store.isCustomEnum( zid );
					expect( actual ).toBe( expected );
				} );

				it( 'returns false when type is Boolean (built-in enum)', () => {
					const zid = 'Z40';
					const expected = false;
					const actual = store.isCustomEnum( zid );
					expect( actual ).toBe( expected );
				} );
			} );
		} );

		describe( 'isWikidataEnum', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
			} );

			it( 'returns false if zid is undefined', () => {
				const zid = undefined;
				expect( store.isWikidataEnum( zid ) ).toBe( false );
			} );

			it( 'returns false if object is not found', () => {
				const zid = 'Z99999';
				expect( store.isWikidataEnum( zid ) ).toBe( false );
			} );

			it( 'returns true if object is a Wikidata enum (Z6884)', () => {
				const zid = 'Z20009';
				expect( store.isWikidataEnum( zid ) ).toBe( true );
			} );

			it( 'returns false if object is not a Wikidata enum', () => {
				const zid = 'Z20008';
				expect( store.isWikidataEnum( zid ) ).toBe( false );
			} );
		} );

		describe( 'getReferencesOfWikidataEnum', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
			} );
			it( 'returns undefined if zid is undefined', () => {
				expect( store.getReferencesOfWikidataEnum( undefined ) ).toBeUndefined();
			} );

			it( 'returns undefined if object is not found', () => {
				expect( store.getReferencesOfWikidataEnum( 'Z99999' ) ).toBeUndefined();
			} );

			it( 'returns references if present', () => {
				const zid = 'Z20009';
				const references = [
					'Z6091',
					{ Z1K1: 'Z6091', Z6091K1: 'Q499327' },
					{ Z1K1: 'Z6091', Z6091K1: 'Q1775415' },
					{ Z1K1: 'Z6091', Z6091K1: 'Q1775461' }
				];
				expect( store.getReferencesOfWikidataEnum( zid ) ).toEqual( references );
			} );
		} );

		describe( 'getTypeOfWikidataEnum', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
			} );
			it( 'returns undefined if zid is undefined', () => {
				expect( store.getTypeOfWikidataEnum( undefined ) ).toBeUndefined();
			} );

			it( 'returns undefined if object is not found', () => {
				expect( store.getTypeOfWikidataEnum( 'Z99999' ) ).toBeUndefined();
			} );

			it( 'returns first value of references as type', () => {
				expect( store.getTypeOfWikidataEnum( 'Z20009' ) ).toBe( 'Z6091' );
			} );
		} );

		describe( 'getReferencesIdsOfWikidataEnum', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
			} );
			it( 'returns empty array if references are not present', () => {
				Object.defineProperty( store, 'getReferencesOfWikidataEnum', {
					value: jest.fn().mockReturnValue( undefined )
				} );
				expect( store.getReferencesIdsOfWikidataEnum( 'Z20009' ) ).toEqual( [] );
			} );

			it( 'returns array of ids from references', () => {
				expect( store.getReferencesIdsOfWikidataEnum( 'Z20009' ) ).toEqual( [ 'Q499327', 'Q1775415', 'Q1775461' ] );
			} );
		} );

		describe( 'getDescription', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
				Object.defineProperty( store, 'getLanguageIsoCodeOfZLang', {
					value: jest.fn().mockReturnValue( 'en' )
				} );
			} );

			it( 'Returns undefined if the object is not stored', () => {
				expect( store.getDescription( 'Z99999' ) ).toBeUndefined();
			} );

			it( 'Returns undefined if the object has no description', () => {
				expect( store.getDescription( 'Z10001' ) ).toBeUndefined();
			} );

			it( 'Returns the first description if available', () => {
				mw.language.getFallbackLanguageChain = () => [ 'es', 'en' ];

				const descriptionData = store.getDescription( 'Z1' );

				expect( descriptionData.zid ).toEqual( 'Z1' );
				expect( descriptionData.label ).toEqual( 'Object description' );
				expect( descriptionData.isUntitled ).toBe( false );
				expect( descriptionData.lang ).toBe( 'Z1002' );
				expect( descriptionData.langCode ).toBe( 'en' );
				expect( descriptionData.langDir ).toBe( 'ltr' );
				expect( descriptionData.isUserLang ).toBe( false );
				expect( descriptionData.isFallbackLang ).toBe( true );
			} );
		} );

		describe( 'lookupFunctions', () => {
			beforeEach( () => {
				jest.useFakeTimers(); // Fake timers for debounce control
			} );
			it( 'Debounces and calls the API with the correct parameters', async () => {
				const payload = { search: 'Test', renderable: true };

				// Call lookupFunctions and simulate debounce
				const promise = store.lookupFunctions( payload );

				// Fast-forward time to simulate debounce delay
				jest.runAllTimers();

				// Ensure searchFunctionsGetMock is called after debounce timeout
				expect( mw.Api ).toHaveBeenCalledTimes( 1 );
				expect( searchFunctionsGetMock ).toHaveBeenCalledWith( {
					action: 'query',
					list: 'wikilambdasearch_functions',
					format: 'json',
					formatversion: '2',
					wikilambdasearch_functions_continue: undefined,
					wikilambdasearch_functions_input_types: undefined,
					wikilambdasearch_functions_language: 'en',
					wikilambdasearch_functions_limit: undefined,
					wikilambdasearch_functions_output_type: undefined,
					wikilambdasearch_functions_renderable: true,
					wikilambdasearch_functions_search: 'Test'
				} );

				// Resolve the promise and check results
				await expect( promise ).resolves.toEqual( {
					objects: [ { page_title: 'Z100', label: 'Test Function' } ],
					searchContinue: null
				} );
			} );
		} );

		describe( 'getOutputTypeOfFunctionZid', () => {
			it( 'Returns undefined if the function is not stored', () => {
				expect( store.getOutputTypeOfFunctionZid( 'Z99999' ) ).toBeUndefined();
			} );

			it( 'Returns undefined if the object is not a function', () => {
				store.objects = mockStoredObjects;
				expect( store.getOutputTypeOfFunctionZid( 'Z6' ) ).toBeUndefined();
			} );

			it( 'Returns the output type of a stored function', () => {
				store.objects = mockStoredObjects;
				expect( store.getOutputTypeOfFunctionZid( 'Z802' ) ).toEqual( 'Z1' );
			} );
		} );
	} );

	describe( 'Actions', () => {
		beforeEach( () => {
			Object.defineProperty( store, 'getUserLangCode', {
				value: 'en'
			} );
		} );

		describe( 'setEnumData', () => {
			it( 'initializes enum data when no previous data exists', () => {
				store.enums = {};
				const payload = {
					zid: 'Z30000',
					data: mockEnumValues
				};

				store.setEnumData( payload );
				expect( store.enums.Z30000 ).toEqual( { data: mockEnumValues } );
			} );

			it( 'overwrites existing promise data with new values', () => {
				store.enums = {
					Z30000: {
						data: new Promise( ( resolve ) => {
							resolve();
						} )
					}
				};
				const payload = {
					zid: 'Z30000',
					data: mockEnumValues
				};

				store.setEnumData( payload );
				expect( store.enums.Z30000 ).toEqual( { data: mockEnumValues } );
			} );

			it( 'appends new values to existing data for the same enum zid', () => {
				store.enums = {
					Z30000: {
						data: mockEnumValues
					}
				};
				const payload = {
					zid: 'Z30000',
					data: mockEnumValues,
					searchContinue: 1
				};

				store.setEnumData( payload );
				const expected = mockEnumValues.concat( mockEnumValues );
				expect( store.enums.Z30000 ).toEqual( { searchContinue: 1, data: expected } );
			} );
		} );

		describe( 'setLanguageCode', () => {
			it( 'sets language sids indexed by language code', () => {
				store.languages = {};
				const payload = {
					code: 'en',
					zid: 'Z1002'
				};

				store.setLanguageCode( payload );
				expect( store.languages.en ).toEqual( 'Z1002' );
			} );
		} );

		describe( 'prefetchZids', () => {
			it( 'prefetchZids function performs expected actions', () => {
				store.fetchZids = jest.fn();
				Object.defineProperty( store, 'getUserLangZid', {
					value: 'Z1002'
				} );

				store.prefetchZids();

				expect( store.fetchZids ).toHaveBeenCalledTimes( 1 );
				// No need to check specific prefetched keys, just that keys are being fetched
				expect( store.fetchZids ).toHaveBeenCalledWith( expect.anything() );
			} );
		} );

		describe( 'fetchZids', () => {

			it( 'Call api.get if the zId is not already in the state', () => {
				const zids = [ 'Z1' ];

				return store.fetchZids( { zids } ).then( () => {
					expect( mw.Api ).toHaveBeenCalledTimes( 2 );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						formatversion: '2',
						wikilambdaload_zids: 'Z1',
						wikilambdaload_language: 'en',
						wikilambdaload_get_dependencies: 'true'
					} );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						formatversion: '2',
						wikilambdaload_zids: 'Z1002',
						wikilambdaload_language: 'en',
						wikilambdaload_get_dependencies: 'true'
					} );
				} );
			} );

			it( 'Call api.get with multiple Zids as a string separated by | ', () => {
				const zids = [ 'Z1', 'Z6' ];
				const expectedWikiLambdaloadZids = 'Z1|Z6';

				return store.fetchZids( { zids } ).then( () => {
					expect( mw.Api ).toHaveBeenCalledTimes( 2 );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						formatversion: '2',
						wikilambdaload_zids: expectedWikiLambdaloadZids,
						wikilambdaload_language: 'en',
						wikilambdaload_get_dependencies: 'true'
					} );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						formatversion: '2',
						wikilambdaload_zids: 'Z1002',
						wikilambdaload_language: 'en',
						wikilambdaload_get_dependencies: 'true'
					} );
				} );
			} );

			it( 'Will NOT call the APi if the Zids are already fetched', () => {
				const zids = [ 'Z1', 'Z6' ];
				store.objects = mockStoredObjects;

				return store.fetchZids( { zids } ).then( () => {
					expect( mw.Api ).toHaveBeenCalledTimes( 0 );
					expect( getMock ).toHaveBeenCalledTimes( 0 );
				} );
			} );

			it( 'Will call the APi only with the Zids that are not yet fetched', () => {
				const zids = [ 'Z1', 'Z2', 'Z6' ];
				const expectedWikiLambdaloadZids = 'Z2|Z6';
				store.objects = {
					Z1: mockStoredObjects.Z1
				};

				return store.fetchZids( { zids } ).then( () => {
					expect( mw.Api ).toHaveBeenCalledTimes( 2 );
					expect( getMock ).toHaveBeenCalledTimes( 2 );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						formatversion: '2',
						wikilambdaload_zids: expectedWikiLambdaloadZids,
						wikilambdaload_language: 'en',
						wikilambdaload_get_dependencies: 'true'
					} );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						formatversion: '2',
						wikilambdaload_zids: 'Z1002',
						wikilambdaload_language: 'en',
						wikilambdaload_get_dependencies: 'true'
					} );
				} );
			} );

			it( 'Will Update the stored collection with the objects in the API response', () => {
				store.setStoredObject = jest.fn();
				const zids = [ 'Z1', 'Z2', 'Z6' ];
				const expectedAddZ1 = expect.objectContaining( {
					zid: 'Z1',
					data: expect.any( Object )
				} );
				const expectedAddZ2 = expect.objectContaining( {
					zid: 'Z2',
					data: expect.any( Object )
				} );
				const expectedAddZ6 = expect.objectContaining( {
					zid: 'Z6',
					data: expect.any( Object )
				} );

				return store.fetchZids( { zids } ).then( () => {
					expect( mw.Api ).toHaveBeenCalledTimes( 2 );
					expect( getMock ).toHaveBeenCalledTimes( 2 );
					expect( store.setStoredObject ).toHaveBeenCalledWith( expectedAddZ1 );
					expect( store.setStoredObject ).toHaveBeenCalledWith( expectedAddZ2 );
					expect( store.setStoredObject ).toHaveBeenCalledWith( expectedAddZ6 );
				} );
			} );

			it( 'fetches zids in batches of 50', () => {
				// 123 zids, three batches of lengths: 50, 50, 23
				const zids = [];
				for ( let i = 1; i <= 123; i++ ) {
					zids.push( `Z${ i }` );
				}
				const batch1 = zids.slice( 0, 50 );
				const batch2 = zids.slice( 50, 100 );
				const batch3 = zids.slice( 100, 123 );

				return store.fetchZids( { zids } ).then( () => {
					expect( getMock ).toHaveBeenCalledTimes( 4 );
					expect( getMock ).toHaveBeenNthCalledWith( 1, {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						formatversion: '2',
						wikilambdaload_zids: batch1.join( '|' ),
						wikilambdaload_language: 'en',
						wikilambdaload_get_dependencies: 'true'
					} );
					expect( getMock ).toHaveBeenNthCalledWith( 2, {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						formatversion: '2',
						wikilambdaload_zids: batch2.join( '|' ),
						wikilambdaload_language: 'en',
						wikilambdaload_get_dependencies: 'true'
					} );
					expect( getMock ).toHaveBeenNthCalledWith( 3, {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						formatversion: '2',
						wikilambdaload_zids: batch3.join( '|' ),
						wikilambdaload_language: 'en',
						wikilambdaload_get_dependencies: 'true'
					} );
				} );
			} );

			it( 'request only the zids that have not been requested before', () => {
				const first = [ 'Z1', 'Z2', 'Z3', 'Z4' ];
				const second = [ 'Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6' ];

				store.performFetchZids = jest.fn().mockResolvedValue( true );

				// Run two inmediate calls with repeated zids
				store.fetchZids( { zids: first } );
				return store.fetchZids( { zids: second } ).then( () => {
					expect( store.performFetchZids ).toHaveBeenNthCalledWith( 1, { zids: first } );
					expect( store.performFetchZids ).toHaveBeenNthCalledWith( 2, { zids: [ 'Z5', 'Z6' ] } );
				} );
			} );

			it( 'updates the languages state property when language is retrieved', () => {
				const zids = [ 'Z1003' ];
				getMock = jest.fn().mockResolvedValue( mockApiResponseFor( zids ) );
				store.setLanguageCode = jest.fn();

				return store.fetchZids( { zids } ).then( () => {
					expect( store.setLanguageCode ).toHaveBeenCalledWith( { zid: 'Z1003', code: 'es' } );
				} );
			} );

			describe( 'Fetch dependencies', () => {
				it( 'requests the language Zids of the returned labels', async () => {
					const zids = [ 'Z20001' ];
					getMock = jest.fn().mockResolvedValue( mockApiResponseFor( zids ) );
					const fetchZidsSpy = jest.spyOn( store, 'fetchZids' );

					await store.fetchZids( { zids } );

					expect( fetchZidsSpy ).toHaveBeenCalledTimes( 3 );
					expect( fetchZidsSpy ).toHaveBeenCalledWith( { zids: [ 'Z1003', 'Z1002' ] } );

				} );

				it( 'requests the renderer/parser Zids of the returned type', async () => {
					const zids = [ 'Z20002' ];
					getMock = jest.fn().mockResolvedValue( mockApiResponseFor( zids ) );
					const fetchZidsSpy = jest.spyOn( store, 'fetchZids' );
					store.setRenderer = jest.fn();
					store.setParser = jest.fn();

					await store.fetchZids( { zids } );
					expect( fetchZidsSpy ).toHaveBeenCalledWith( { zids: [ 'Z1002', 'Z20020', 'Z20030' ] } );
					expect( store.setRenderer ).toHaveBeenCalledWith( { type: 'Z20002', renderer: 'Z20020' } );
					expect( store.setParser ).toHaveBeenCalledWith( { type: 'Z20002', parser: 'Z20030' } );

				} );
			} );
		} );

		describe( 'fetchEnumValues', () => {
			beforeEach( () => {
				store.setEnumData = jest.fn();
				getMock = jest.fn( () => new Promise( ( resolve ) => {
					const data = { query: { wikilambdasearch_labels: mockEnumValues } };
					resolve( data );
				} ) );
			} );

			it( 'exits early if enum type is already fetched', () => {
				Object.defineProperty( store, 'getEnum', {
					value: jest.fn().mockReturnValue( { data: [] } )
				} );

				store.fetchEnumValues( { type: 'Z30000' } );

				expect( store.setEnumData ).not.toHaveBeenCalled();
				expect( getMock ).not.toHaveBeenCalled();
			} );

			it( 'calls the lookup api with the requested zid and saves the pending and final states', async () => {
				Object.defineProperty( store, 'getEnum', {
					value: jest.fn().mockReturnValue( undefined )
				} );
				const promise = store.fetchEnumValues( { type: 'Z30000' } );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'query',
					list: 'wikilambdasearch_labels',
					format: 'json',
					formatversion: '2',
					wikilambdasearch_continue: undefined,
					wikilambdasearch_limit: 10,
					wikilambdasearch_return_type: undefined,
					wikilambdasearch_search: '',
					wikilambdasearch_type: 'Z30000',
					wikilambdasearch_language: 'en'
				} );

				expect( store.setEnumData ).toHaveBeenCalledWith( {
					zid: 'Z30000',
					data: promise
				} );

				await promise;
				expect( store.setEnumData ).toHaveBeenCalledWith( {
					zid: 'Z30000',
					data: mockEnumValues,
					searchContinue: null
				} );
			} );
		} );
	} );
} );
