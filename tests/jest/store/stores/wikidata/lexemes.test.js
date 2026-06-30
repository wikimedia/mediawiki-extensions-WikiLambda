/*!
 * WikiLambda unit test suite for the Wikidata lexemes Pinia store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const LabelData = require( '../../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );

const lexemeFormId = 'L333333-F5';

// Test data for sense processing
const senseWithItem = {
	id: 'L333333-S3',
	glosses: {
		de: { language: 'de', value: 'german gloss' }
	},
	claims: {
		P5137: [ {
			mainsnak: {
				datavalue: {
					value: { id: 'Q123' }
				}
			}
		} ]
	}
};

const senseWithoutItem = {
	id: 'L333333-S2',
	glosses: {
		de: { language: 'de', value: 'german gloss' }
	},
	claims: {}
};

const senseWithAvailableGloss = {
	id: 'L333333-S1',
	glosses: {
		en: { language: 'en', value: 'english gloss' }
	},
	claims: {}
};
// Lexeme data with senses and forms
const lexemeData = {
	title: 'Lexeme:L333333',
	lemmas: {
		en: { language: 'en', value: 'turtle' }
	},
	forms: [ {
		id: lexemeFormId,
		representations: {
			fr: { language: 'fr', value: 'tortue' },
			en: { language: 'en', value: 'turtled' }
		},
		grammaticalFeatures: [ 'Q1230649' ],
		claims: {}
	} ],
	senses: [
		senseWithAvailableGloss,
		senseWithoutItem,
		senseWithItem
	]
};

// Item data for sense processing
const itemDataWithoutLabel = {
	id: 'L333333-S1',
	labels: { de: { language: 'de', value: 'german label' } },
	descriptions: {}
};

const itemDataWithLabelAndDescription = {
	id: 'Q123',
	labels: { en: { language: 'en', value: 'Item Label' } },
	descriptions: { en: { language: 'en', value: 'Item Description' } }
};

const itemDataWithLabelOnly = {
	id: 'Q123',
	labels: { en: { language: 'en', value: 'Item Label' } },
	descriptions: {}
};

describe( 'Wikidata Lexemes Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.lexemes = {};
	} );

	describe( 'Getters', () => {
		describe( 'getLexemeData', () => {
			it( 'returns undefined if lexeme is not available', () => {
				const lexemeId = 'L333333';
				const expected = undefined;
				expect( store.getLexemeData( lexemeId ) ).toEqual( expected );
			} );

			it( 'returns lexeme data if available', () => {
				store.lexemes.L333333 = lexemeData;
				const lexemeId = 'L333333';
				const expected = lexemeData;
				expect( store.getLexemeData( lexemeId ) ).toEqual( expected );
			} );
		} );

		describe( 'getLexemeFormData', () => {
			it( 'returns undefined if lexeme is not available', () => {
				const expected = undefined;
				expect( store.getLexemeFormData( lexemeFormId ) ).toEqual( expected );
			} );

			it( 'returns undefined if lexeme form is not available', () => {
				store.lexemes.L333333 = lexemeData;
				const expected = undefined;
				expect( store.getLexemeFormData( 'L333333-F3' ) ).toEqual( expected );
			} );

			it( 'returns lexeme form data if available', () => {
				store.lexemes.L333333 = lexemeData;
				const expected = lexemeData.forms[ 0 ];
				expect( store.getLexemeFormData( lexemeFormId ) ).toEqual( expected );
			} );
		} );

		describe( 'getLexemeLabelData', () => {
			it( 'returns undefined when lexeme ID is undefined', () => {
				const expected = undefined;
				expect( store.getLexemeLabelData( undefined ) ).toEqual( expected );
			} );

			it( 'returns lexeme ID as label when lexeme data is not available', () => {
				const lexemeId = 'L333333';
				const expected = new LabelData( lexemeId, lexemeId, null );
				expect( store.getLexemeLabelData( lexemeId ) ).toEqual( expected );
			} );

			it( 'returns lexeme label data when lexeme data is available', () => {
				const lexemeId = 'L333333';
				store.lexemes[ lexemeId ] = lexemeData;
				const expected = new LabelData( lexemeId, 'turtle', null, 'en' );
				expect( store.getLexemeLabelData( lexemeId ) ).toEqual( expected );
			} );
		} );

		describe( 'getLexemeFormLabelData', () => {
			it( 'returns undefined when lexeme form ID is undefined', () => {
				const expected = undefined;
				expect( store.getLexemeFormLabelData( undefined ) ).toEqual( expected );
			} );

			it( 'returns lexeme form ID as label when lexeme form data is not available', () => {
				const expected = new LabelData( lexemeFormId, lexemeFormId, null );
				expect( store.getLexemeFormLabelData( lexemeFormId ) ).toEqual( expected );
			} );

			it( 'returns lexeme form label data in user language when lexeme form data is available', () => {
				store.lexemes.L333333 = lexemeData;
				const expected = new LabelData( lexemeFormId, 'turtled', null, 'en' );
				expect( store.getLexemeFormLabelData( lexemeFormId ) ).toEqual( expected );
			} );

			it( 'returns lexeme form label data in fallback language if user language not present when lexeme form data is available', () => {
				Object.defineProperty( store, 'getUserLangCode', {
					value: 'de'
				} );
				store.lexemes.L333333 = lexemeData;
				const expected = new LabelData( lexemeFormId, 'tortue', null, 'fr' );
				expect( store.getLexemeFormLabelData( lexemeFormId ) ).toEqual( expected );
			} );

			it( 'returns lexeme form ID as label if no representations', () => {
				store.lexemes.L333333 = {
					forms: [ {
						id: lexemeFormId,
						representations: {}
					} ]
				};
				const expected = new LabelData( lexemeFormId, lexemeFormId, null );
				expect( store.getLexemeFormLabelData( lexemeFormId ) ).toEqual( expected );
			} );
		} );

		describe( 'getLexemeUrl', () => {
			it( 'returns undefined if id is not provided', () => {
				expect( store.getLexemeUrl( undefined ) ).toBeUndefined();
				expect( store.getLexemeUrl( '' ) ).toBeUndefined();
			} );
			it( 'returns undefined with non-valid lexeme Id', () => {
				expect( store.getItemUrl( 'bad' ) ).toBeUndefined();
			} );
			it( 'returns correct URL for lexeme', () => {
				expect( store.getLexemeUrl( 'L333333' ) ).toContain( Constants.WIKIDATA_BASE_URL );
				expect( store.getLexemeUrl( 'L333333' ) ).toContain( 'Lexeme:L333333' );
			} );
		} );

		describe( 'getLexemeFormUrl', () => {
			it( 'returns undefined if id is not provided', () => {
				expect( store.getLexemeFormUrl( undefined ) ).toBeUndefined();
				expect( store.getLexemeFormUrl( '' ) ).toBeUndefined();
			} );
			it( 'returns undefined with non-valid lexeme form Id', () => {
				expect( store.getLexemeFormUrl( 'bad' ) ).toBeUndefined();
			} );
			it( 'returns correct URL for lexeme form', () => {
				expect( store.getLexemeFormUrl( lexemeFormId ) ).toContain( Constants.WIKIDATA_BASE_URL );
				expect( store.getLexemeFormUrl( lexemeFormId ) ).toContain( 'Lexeme:L333333#F5' );
			} );
		} );

		describe( 'getLexemeSenseUrl', () => {
			it( 'returns undefined if id is not provided', () => {
				expect( store.getLexemeSenseUrl( undefined ) ).toBeUndefined();
				expect( store.getLexemeSenseUrl( '' ) ).toBeUndefined();
			} );
			it( 'returns undefined with non-valid lexeme sense Id', () => {
				expect( store.getLexemeSenseUrl( 'bad' ) ).toBeUndefined();
			} );
			it( 'returns correct URL for lexeme sense', () => {
				expect( store.getLexemeSenseUrl( 'L333333-S1' ) ).toContain( Constants.WIKIDATA_BASE_URL );
				expect( store.getLexemeSenseUrl( 'L333333-S1' ) ).toContain( 'Lexeme:L333333#S1' );
			} );
		} );

		describe( 'getLexemeSenseData', () => {
			it( 'returns undefined when lexeme sense ID is not found', () => {
				const result = store.getLexemeSenseData( 'L333333-S9' );
				expect( result ).toBeUndefined();
			} );

			it( 'returns undefined when lexeme has no senses', () => {
				store.lexemes.L333333 = {
					title: 'Lexeme:L333333',
					lemmas: {},
					forms: [],
					senses: []
				};

				const result = store.getLexemeSenseData( 'L333333-S1' );
				expect( result ).toBeUndefined();
			} );

			it( 'returns the lexeme sense data when found', () => {
				store.senses.L333333 = lexemeData.senses;

				const result = store.getLexemeSenseData( 'L333333-S1' );
				expect( result ).toEqual( lexemeData.senses[ 0 ] );
			} );
		} );

		describe( 'getLexemeSenseLabelData', () => {
			beforeEach( () => {
				Object.defineProperty( store, 'getUserLangCode', {
					value: 'en'
				} );
			} );

			it( 'returns undefined when lexeme sense ID is undefined', () => {
				const result = store.getLexemeSenseLabelData( undefined );
				expect( result ).toBeUndefined();
			} );

			it( 'returns lexeme sense ID as label when lexeme sense data is not available', () => {
				const result = store.getLexemeSenseLabelData( 'L333333-S9' );
				expect( result ).toEqual( new LabelData( 'L333333-S9', 'L333333-S9', null ) );
			} );

			it( 'returns lexeme sense label data in user language when available', () => {
				store.senses.L333333 = lexemeData.senses;

				const result = store.getLexemeSenseLabelData( 'L333333-S1' );
				expect( result ).toEqual( new LabelData( 'L333333-S1', 'english gloss', null, 'en' ) );
			} );

			it( 'returns lexeme sense label data in fallback language when user language not available', () => {
				// Change user language to German to test fallback
				Object.defineProperty( store, 'getUserLangCode', {
					value: 'de'
				} );
				store.senses.L333333 = lexemeData.senses;

				const result = store.getLexemeSenseLabelData( 'L333333-S1' );
				expect( result ).toEqual( new LabelData( 'L333333-S1', 'english gloss', null, 'en' ) );
			} );

			it( 'returns lexeme sense ID as label when no glosses available', () => {
				// Create a sense that has no glosses
				const senseWithoutGlosses = [
					{
						id: 'L333333-S1',
						glosses: {},
						claims: {}
					}
				];
				store.senses.L333333 = senseWithoutGlosses;

				const result = store.getLexemeSenseLabelData( 'L333333-S1' );
				expect( result ).toEqual( new LabelData( 'L333333-S1', 'L333333-S1', null ) );
			} );
		} );

		describe( 'getLexemeDataAsync', () => {
			it( 'returns resolved promise if lexeme is cached', async () => {
				store.lexemes.L333333 = lexemeData;
				const result = await store.getLexemeDataAsync( 'L333333' );
				expect( result ).toEqual( lexemeData );
			} );

			it( 'returns in-flight promise if lexeme is being fetched', async () => {
				let resolveFn;
				const promise = new Promise( ( resolve ) => {
					resolveFn = resolve;
				} );
				store.lexemes.L333333 = promise;
				const resultPromise = store.getLexemeDataAsync( 'L333333' );
				expect( resultPromise ).toBe( promise );
				resolveFn( lexemeData );
				expect( resultPromise ).resolves.toEqual( lexemeData );
			} );

			it( 'returns rejected promise if lexeme is not present', async () => {
				expect( store.getLexemeDataAsync( 'L_NOT_PRESENT' ) ).rejects.toThrow( 'Lexeme L_NOT_PRESENT not found' );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'setLexemeData', () => {
			it( 'stores a promise directly if data is a promise', () => {
				const promise = Promise.resolve( 'foo' );
				store.setLexemeData( { id: 'L999999', data: promise } );
				expect( store.lexemes.L999999 ).toBe( promise );
			} );
			it( 'unwraps and stores only title, forms, and lemmas if data is an object', () => {
				const data = { title: 'Lexeme:L999999', forms: [], lemmas: {}, extra: 'should not be stored' };
				store.setLexemeData( { id: 'L999999', data } );
				expect( store.lexemes.L999999 ).toEqual( { title: 'Lexeme:L999999', forms: [], lemmas: {} } );
				expect( store.lexemes.L999999.extra ).toBeUndefined();
			} );
		} );

		describe( 'resetLexemeData', () => {
			it( 'removes lexeme data for given IDs', () => {
				store.lexemes = { L111111: 'foo', L222222: 'bar', L333333: 'baz' };
				store.resetLexemeData( { ids: [ 'L111111', 'L333333' ] } );
				expect( store.lexemes ).toEqual( { L222222: 'bar' } );
			} );
		} );

		describe( 'fetchLexemes', () => {
			// NOTE: before T429766 test cases were duplicate between fetchItems/Lexemes/Properties
			// and fetchWikidataEntitiesBatched. Now, fetchItems/Lexemes/Properties tests need to
			// test that the time window behavior is correct, and the call to fetchWikidataEntitiesBatched
			// happens with the right parameters. The internal behavior of the entities fetch method
			// is fully tested in entities.js
			beforeEach( () => {
				store.lexemes = {};
				store.scheduledLexemes = [];
				store.scheduledLexemesPromise = null;
				jest.useFakeTimers();
				Object.defineProperty( store, 'getUserLangCode', { value: 'en' } );
				store.fetchWikidataEntitiesBatched = jest.fn().mockReturnValue( Promise.resolve() );
			} );

			afterEach( () => {
				jest.useRealTimers();
			} );

			it( 'creates a new promise and initiates scheduledLexemes on first call', () => {
				const promise = store.fetchLexemes( { ids: [ 'L111111' ] } );

				expect( store.scheduledLexemes ).toEqual( [ 'L111111' ] );
				expect( store.scheduledLexemesPromise ).toStrictEqual( promise );
				expect( promise ).toBeInstanceOf( Promise );
			} );

			it( 'subsequent calls within the time window add to scheduledLexemes and return the same promise', () => {
				const promise1 = store.fetchLexemes( { ids: [ 'L111111' ] } );
				const promise2 = store.fetchLexemes( { ids: [ 'L222222' ] } );
				const promise3 = store.fetchLexemes( { ids: [ 'L111111', 'L333333' ] } );

				expect( store.scheduledLexemes ).toEqual( [ 'L111111', 'L222222', 'L333333' ] );
				expect( promise2 ).toStrictEqual( promise1 );
				expect( promise3 ).toStrictEqual( promise1 );
			} );

			it( 'deduplicates ids across concurrent calls', () => {
				store.fetchLexemes( { ids: [ 'L111111', 'L222222' ] } );
				store.fetchLexemes( { ids: [ 'L222222', 'L333333' ] } );

				expect( store.scheduledLexemes ).toEqual( [ 'L111111', 'L222222', 'L333333' ] );
			} );

			it( 'calls fetchWikidataEntitiesBatched with collected qids', () => {
				store.fetchLexemes( { ids: [ 'L111111' ] } );
				store.fetchLexemes( { ids: [ 'L222222' ] } );

				jest.runAllTimers();

				expect( store.fetchWikidataEntitiesBatched ).toHaveBeenCalledWith( {
					ids: [ 'L111111', 'L222222' ],
					getData: expect.any( Function ),
					setData: expect.any( Function ),
					resetData: expect.any( Function )
				} );
			} );

			it( 'calls fetchWikidataEntitiesBatched with the correct item setters and getters', () => {
				// Mock getter, setter an resetter
				const mockGetter = jest.fn();
				const mockSetter = jest.fn();
				const mockResetter = jest.fn();

				Object.defineProperty( store, 'getLexemeData', { value: mockGetter } );
				store.setLexemeData = mockSetter;
				store.resetLexemeData = mockResetter;

				// Make call
				store.fetchLexemes( { ids: [ 'L111111' ] } );
				jest.runAllTimers();

				const call = store.fetchWikidataEntitiesBatched.mock.calls[ 0 ][ 0 ];

				// Check getter
				call.getData( 'L111111' );
				expect( mockGetter ).toHaveBeenCalledWith( 'L111111' );

				// Check setter
				call.setData( { id: 'L111111', data: lexemeData } );
				expect( mockSetter ).toHaveBeenCalledWith( { id: 'L111111', data: lexemeData } );

				// Check resetter
				call.resetData( { ids: [ 'L111111' ] } );
				expect( mockResetter ).toHaveBeenCalledWith( { ids: [ 'L111111' ] } );
			} );

			it( 'resolves the promise after the time window', async () => {
				const promise = store.fetchLexemes( { ids: [ 'L111111' ] } );

				jest.runAllTimers();
				await promise;

				expect( store.fetchWikidataEntitiesBatched ).toHaveBeenCalledTimes( 1 );
			} );

			it( 'resets scheduledLexemes and scheduledLexemesPromise after the time window', async () => {
				const promise = store.fetchLexemes( { ids: [ 'L111111' ] } );

				jest.runAllTimers();
				await promise;

				expect( store.scheduledLexemes ).toEqual( [] );
				expect( store.scheduledLexemesPromise ).toBeNull();
			} );

			it( 'allows a new window to start after the previous one resolves', async () => {
				const promise1 = store.fetchLexemes( { ids: [ 'L111111' ] } );
				jest.runAllTimers();
				await promise1;

				const promise2 = store.fetchLexemes( { ids: [ 'L222222' ] } );
				jest.runAllTimers();
				await promise2;

				expect( promise2 ).not.toBe( promise1 );
				expect( store.fetchWikidataEntitiesBatched ).toHaveBeenCalledTimes( 2 );
			} );
		} );

		describe( 'fetchLexemeSenseFallbackLabels', () => {
			beforeEach( () => {
				Object.defineProperty( store, 'getUserLangCode', {
					value: 'en'
				} );
				// Initialize items store
				store.items = {};
			} );

			it( 'returns the original sense if sense already has a gloss in user language', async () => {
				const result = await store.fetchLexemeSenseFallbackLabels( senseWithAvailableGloss );
				expect( result ).toBe( senseWithAvailableGloss );
			} );

			it( 'returns the original sense if sense has no item for this sense', async () => {
				const result = await store.fetchLexemeSenseFallbackLabels( senseWithoutItem );
				expect( result ).toBe( senseWithoutItem );
			} );

			it( 'returns the original sense when item has no label in user language', async () => {
				store.items.Q123 = itemDataWithoutLabel;

				const result = await store.fetchLexemeSenseFallbackLabels( senseWithItem );
				expect( result ).toBe( senseWithItem );
				expect( result.glosses.en ).toBeUndefined();
			} );

			it( 'returns the original sense when item is not in store', async () => {
				delete store.items.Q123;

				const result = await store.fetchLexemeSenseFallbackLabels( senseWithItem );
				expect( result ).toBe( senseWithItem );
				expect( result.glosses.en ).toBeUndefined();
			} );

			it( 'returns modified sense with fallback label when item has label and description', async () => {
				store.items.Q123 = itemDataWithLabelAndDescription;

				const result = await store.fetchLexemeSenseFallbackLabels( senseWithItem );
				expect( result.glosses.en ).toEqual( {
					value: 'Item Label - Item Description',
					language: 'en'
				} );
			} );

			it( 'returns modified sense with fallback label when item has only label', async () => {
				store.items.Q123 = itemDataWithLabelOnly;

				const result = await store.fetchLexemeSenseFallbackLabels( senseWithItem );
				expect( result.glosses.en ).toEqual( {
					value: 'Item Label',
					language: 'en'
				} );
			} );
		} );

		describe( 'fetchLexemeSenses', () => {
			beforeEach( () => {
				store.lexemes = {};
				store.senses = {};
				store.lexemes.L333333 = lexemeData;
				store.items.Q123 = itemDataWithLabelAndDescription;
				Object.defineProperty( store, 'getUserLangCode', {
					value: 'en'
				} );
				store.setLexemeSensesData = jest.fn();
			} );

			it( 'processes senses for fallback labels', async () => {
				await store.fetchLexemeSenses( { lexemeIds: [ 'L333333' ] } );

				expect( store.setLexemeSensesData ).toHaveBeenCalledWith( {
					lexemeId: 'L333333',
					data: [
						senseWithAvailableGloss,
						senseWithoutItem,
						// English item for sense 3 added to the glosses
						Object.assign( {}, senseWithItem, {
							glosses: {
								de: {
									language: 'de',
									value: 'german gloss'
								},
								en: {
									language: 'en',
									value: 'Item Label - Item Description'
								}
							}
						} )
					]
				} );
			} );
		} );
	} );
} );
