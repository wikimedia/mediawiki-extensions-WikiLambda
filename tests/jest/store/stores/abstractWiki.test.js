/*!
 * WikiLambda unit test suite for the Abstract Wiki Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { setActivePinia, createPinia } = require( 'pinia' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const abstractUtils = require( '../../../../resources/ext.wikilambda.app/utils/abstractUtils.js' );

const mockLang = 'Z1002';
const mockDate = '26-7-2023';
const mockQid = 'Q96807071';
const ledeQid = 'Q8776414';

const fragmentCacheKey = ( keyPath, lang = mockLang ) => abstractUtils.getFragmentCacheKey( keyPath, lang );
const mockEmptyAbstractContent = {
	qid: mockQid,
	sections: {
		Q8776414: {
			index: 0,
			fragments: [ 'Z89' ]
		}
	}
};

const fragmentsOf = ( content ) => content.sections[ ledeQid ].fragments;

const mockAbstractContent = {
	qid: mockQid,
	sections: {
		Q8776414: {
			index: 0,
			fragments: [
				'Z89',
				{ Z1K1: 'Z7', Z7K1: 'Z444', Z444K1: 'some composition' }
			]
		}
	}
};
const mockAbstractContentHybrid = {
	qid: mockQid,
	sections: {
		Q8776414: {
			index: 0,
			fragments: [
				{ Z1K1: 'Z9', Z9K1: 'Z89' },
				{
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
					Z7K1: { Z1K1: 'Z9', Z9K1: 'Z444' },
					Z444K1: { Z1K1: 'Z6', Z6K1: 'some composition' }
				}
			]
		}
	}
};

describe( 'abstractWiki Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.jsonObject = { abstractwiki: {} };
		store.qid = undefined;
		store.fragments = {};
		store.highlight = undefined;
		store.previewLanguageZid = mockLang;

		Object.defineProperty( store, 'getItemLabelData', {
			value: jest.fn().mockReturnValue( { label: 'Abstract Wikipedia' } )
		} );
	} );

	describe( 'Getters', () => {
		describe( 'getAbstractWikiId', () => {
			it( 'returns undefined when qid is not set', () => {
				store.qid = undefined;
				expect( store.getAbstractWikiId ).toBeUndefined();
			} );

			it( 'returns the qid when it is set', () => {
				store.qid = mockQid;
				expect( store.getAbstractWikiId ).toBe( mockQid );
			} );
		} );

		describe( 'getAbstractContentSections', () => {
			it( 'returns undefined if there is not abstract content', () => {
				expect( store.getAbstractContentSections ).toBeUndefined();
			} );

			it( 'returns an empty string if there are no sections', () => {
				store.jsonObject.abstractwiki = { qid: mockQid, sections: {} };
				expect( store.getAbstractContentSections ).toEqual( [] );
			} );

			it( 'returns data for each section', () => {
				store.jsonObject.abstractwiki = mockEmptyAbstractContent;
				const expected = [ {
					index: 0,
					fragments: [ 'Z89' ],
					fragmentsPath: 'abstractwiki.sections.Q8776414.fragments',
					isLede: true,
					labelData: { label: 'Abstract Wikipedia' },
					qid: 'Q8776414'
				} ];
				expect( store.getAbstractContentSections ).toEqual( expected );
			} );
		} );

		describe( 'getAbstractWikipediaNamespace', () => {
			it( 'returns the value of wgWikiLambdaAbstractPrimaryNamespace', () => {
				expect( store.getAbstractWikipediaNamespace ).toEqual( 'Abstract_Wikipedia' );
			} );
		} );

		describe( 'getPreviewLanguageZid', () => {
			it( 'returns getUserLangZid when previewLanguageZid is not set', () => {
				store.previewLanguageZid = undefined;
				Object.defineProperty( store, 'getUserLangZid', { value: 'Z1004' } );
				expect( store.getPreviewLanguageZid ).toBe( 'Z1004' );
			} );

			it( 'returns previewLanguageZid when set', () => {
				store.previewLanguageZid = 'Z1003';
				expect( store.getPreviewLanguageZid ).toBe( 'Z1003' );
			} );
		} );

		describe( 'getFragmentPreview', () => {
			it( 'returns undefined if the fragment is not stored', () => {
				const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';
				expect( store.getFragmentPreview( keyPath ) ).toBeUndefined();
			} );

			it( 'returns the stored fragment preview for current preview language', () => {
				const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';
				const fragmentPreview = {
					isDirty: false,
					isLoading: false,
					error: false,
					html: '<b>Preview</b>'
				};
				store.fragments[ fragmentCacheKey( keyPath ) ] = fragmentPreview;
				expect( store.getFragmentPreview( keyPath ) ).toEqual( fragmentPreview );
			} );
		} );

		describe( 'getHighlightedFragment', () => {
			it( 'returns undefined if no highlighted fragment', () => {
				expect( store.getHighlightedFragment ).toBeUndefined();
			} );

			it( 'returns the keyPath of the highlighted fragment', () => {
				const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';
				store.highlight = keyPath;
				expect( store.getHighlightedFragment ).toBe( keyPath );
			} );
		} );

		describe( 'getSuggestedHtmlFunctions', () => {
			it( 'returns empty list if nothing set', () => {
				expect( store.getSuggestedHtmlFunctions ).toEqual( [] );
			} );

			it( 'returns the list of suggested function zids', () => {
				store.suggestedHtmlFunctions = [ 'Z10001', 'Z10002' ];
				expect( store.getSuggestedHtmlFunctions ).toEqual( [ 'Z10001', 'Z10002' ] );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'setAbstractWikiId', () => {
			beforeEach( () => {
				store.jsonObject = { abstractwiki: {} };
			} );

			it( 'sets the qid in the state', () => {
				store.setAbstractWikiId( mockQid );
				expect( store.qid ).toBe( mockQid );
			} );

			it( 'sets the qid in the abstract content json', () => {
				store.setAbstractWikiId( mockQid );
				expect(
					store.jsonObject[ Constants.STORED_OBJECTS.ABSTRACT ][ Constants.ABSTRACT_WIKI_QID ]
				).toBe( mockQid );
			} );
		} );

		describe( 'initializeAbstractWikiContent', () => {
			beforeEach( () => {
				// Mock WikiLambdaConfig
				Object.defineProperty( store, 'getWikilambdaConfig', {
					value: {
						title: mockQid,
						content: JSON.stringify( mockAbstractContent )
					}
				} );
				// Mock user language
				Object.defineProperty( store, 'getUserLangCode', { value: 'en' } );
				Object.defineProperty( store, 'getUserLangZid', { value: mockLang } );
				// Mock store actions
				store.setAbstractWikiId = jest.fn();
				store.setJsonObject = jest.fn();
				store.fetchZids = jest.fn();
				store.fetchItems = jest.fn();
				store.setInitialized = jest.fn();
				store.setSuggestedHtmlFunctions = jest.fn();
				// Mock mw.msg with suggested functions
				global.mw.msg = jest.fn().mockReturnValue( '[ "Z10001", "badzid", "Z10002"]' );
			} );

			it( 'initializes the Abstract Wiki content', async () => {
				// Call initialize and await for resolution
				await store.initializeAbstractWikiContent();

				// Qid is set from title
				expect( store.setAbstractWikiId ).toHaveBeenCalledWith( mockQid );

				// Content is transformed to hybrid and stored
				const transformedContent = {
					namespace: 'abstractwiki',
					zobject: mockAbstractContentHybrid
				};
				expect( store.setJsonObject ).toHaveBeenCalledWith( transformedContent );

				// Suggested functions are initialized
				expect( store.setSuggestedHtmlFunctions ).toHaveBeenCalledWith( [ 'Z10001', 'Z10002' ] );

				// Zids are extracted and fetched
				const extractedZids = { zids: [ 'Z1', 'Z9', 'Z89', 'Z7', 'Z444', 'Z6', 'Z10001', 'Z10002' ] };
				expect( store.fetchZids ).toHaveBeenCalledWith( extractedZids );

				// Qids are extracted and fetched
				const extractedQids = { ids: [ mockQid, ledeQid ] };
				expect( store.fetchItems ).toHaveBeenCalledWith( extractedQids );

				// Set page as initialized
				expect( store.setInitialized ).toHaveBeenCalledWith( true );
			} );
		} );

		describe( 'setPreviewLanguageZid', () => {
			it( 'sets the preview language Zid', () => {
				store.setPreviewLanguageZid( 'Z1004' );
				expect( store.previewLanguageZid ).toBe( 'Z1004' );
			} );
		} );

		describe( 'validateAbstractWikiContent', () => {
			it( 'TODO: always returns true', () => {
				expect( store.validateAbstractWikiContent() ).toBe( true );
			} );
		} );

		describe( 'submitAbstractWikiContent', () => {
			let postWithEditTokenMock;

			beforeEach( () => {
				store.qid = mockQid;
				store.jsonObject = { abstractwiki: mockAbstractContentHybrid };

				// Mock mw.Api.postWithEditToken
				postWithEditTokenMock = jest.fn( () => new Promise( ( resolve ) => {
					resolve( { edit: { pageid: 1, title: mockQid } } );
				} ) );
				mw.Api = jest.fn( () => ( {
					postWithEditToken: postWithEditTokenMock
				} ) );
			} );

			it( 'submits a new Abstract Wiki object to create', async () => {
				await store.submitAbstractWikiContent( { summary: 'some summary' } );

				expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
					action: 'edit',
					format: 'json',
					formatversion: '2',
					summary: 'some summary',
					title: `Abstract_Wikipedia:${ mockQid }`,
					text: JSON.stringify( mockAbstractContent, null, 4 )
				}, { signal: undefined } );
			} );
		} );

		describe( 'renderFragmentPreview', () => {
			let getMock;
			let setRenderedFragmentSpy;

			const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';
			const payload = {
				keyPath,
				qid: mockQid,
				language: mockLang,
				date: mockDate,
				fragment: fragmentsOf( mockAbstractContentHybrid )[ 1 ]
			};

			beforeEach( () => {
				store.fragments = {};
				store.fragments[ fragmentCacheKey( keyPath ) ] = {
					isDirty: true,
					isLoading: false,
					error: false,
					html: 'old fragment'
				};

				setRenderedFragmentSpy = jest.spyOn( store, 'setRenderedFragment' );

				// Mock Api GET abstractwiki_run_fragment
				getMock = jest.fn().mockResolvedValue( {
					abstractwiki_run_fragment: { data: 'rendered fragment' }
				} );
				mw.Api = jest.fn( () => ( {
					get: getMock
				} ) );
			} );

			it( 'does not render again if fragment is not dirty', async () => {
				store.fragments[ fragmentCacheKey( keyPath ) ].isDirty = false;

				await store.renderFragmentPreview( payload );

				expect( getMock ).not.toHaveBeenCalled();
				expect( store.fragments[ fragmentCacheKey( keyPath ) ].isDirty ).toBe( false );
			} );

			it( 'does not render again if fragment is loading', async () => {
				store.fragments[ fragmentCacheKey( keyPath ) ].isLoading = true;

				await store.renderFragmentPreview( payload );

				expect( getMock ).not.toHaveBeenCalled();
			} );

			it( 'sets loading state when ongoing render call', () => {
				getMock = jest.fn();

				store.renderFragmentPreview( payload );

				expect( getMock ).toHaveBeenCalled();
				expect( store.fragments[ fragmentCacheKey( keyPath ) ].isLoading ).toBe( true );
			} );

			it( 'runs render fragment and stores successful response', async () => {
				await store.renderFragmentPreview( payload );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'abstractwiki_run_fragment',
					format: 'json',
					formatversion: '2',
					abstractwiki_run_fragment_qid: mockQid,
					abstractwiki_run_fragment_language: mockLang,
					abstractwiki_run_fragment_date: mockDate,
					abstractwiki_run_fragment_fragment: JSON.stringify( fragmentsOf( mockAbstractContent )[ 1 ] )
				}, { signal: undefined } );

				const expectedFragment = { keyPath, language: mockLang, fragment: 'rendered fragment' };
				expect( setRenderedFragmentSpy ).toHaveBeenCalledWith( expectedFragment );

				expect( store.fragments[ fragmentCacheKey( keyPath ) ] ).toEqual( {
					isDirty: false,
					isLoading: false,
					error: false,
					html: 'rendered fragment'
				} );
			} );

			it( 'runs render fragment and stores failed response', async () => {
				getMock = jest.fn().mockRejectedValue( new Error( 'API error' ) );

				await store.renderFragmentPreview( payload );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'abstractwiki_run_fragment',
					format: 'json',
					formatversion: '2',
					abstractwiki_run_fragment_qid: mockQid,
					abstractwiki_run_fragment_language: mockLang,
					abstractwiki_run_fragment_date: mockDate,
					abstractwiki_run_fragment_fragment: JSON.stringify( fragmentsOf( mockAbstractContent )[ 1 ] )
				}, { signal: undefined } );

				const expectedFragment = { keyPath, language: mockLang, error: 'Unable to render fragment' };
				expect( setRenderedFragmentSpy ).toHaveBeenCalledWith( expectedFragment );

				expect( store.fragments[ fragmentCacheKey( keyPath ) ] ).toEqual( {
					isDirty: false,
					isLoading: false,
					error: true,
					html: 'Unable to render fragment'
				} );
			} );
		} );

		describe( 'setRenderedFragment', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';

			beforeEach( () => {
				store.fragments = {};
				store.fragments[ fragmentCacheKey( keyPath ) ] = {
					isDirty: true,
					isLoading: true,
					error: false,
					html: 'old fragment'
				};
			} );

			it( 'sets successful rendered fragment', () => {
				store.setRenderedFragment( {
					keyPath,
					language: mockLang,
					fragment: 'some rendered fragment'
				} );

				expect( store.fragments[ fragmentCacheKey( keyPath ) ] ).toEqual( {
					isDirty: false,
					isLoading: false,
					error: false,
					html: 'some rendered fragment'
				} );
			} );

			it( 'sets failed rendered fragment', () => {
				store.setRenderedFragment( {
					keyPath,
					language: mockLang,
					error: 'some error happened'
				} );

				expect( store.fragments[ fragmentCacheKey( keyPath ) ] ).toEqual( {
					isDirty: false,
					isLoading: false,
					error: true,
					html: 'some error happened'
				} );
			} );

			it( 'sets new fragment', () => {
				const newKeyPath = 'abstractwiki.sections.Q8776414.fragments.1';

				store.setRenderedFragment( {
					keyPath: newKeyPath,
					language: mockLang,
					fragment: 'some new fragment'
				} );

				expect( store.fragments[ fragmentCacheKey( newKeyPath ) ] ).toEqual( {
					isDirty: false,
					isLoading: false,
					error: false,
					html: 'some new fragment'
				} );
			} );
		} );

		describe( 'setDirtyFragment', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';
			const childKeyPath = `${ keyPath }.Z444K1.3`;
			const debounceTime = 2000;

			beforeEach( () => {
				jest.useFakeTimers();

				store.fragments = {};
				store.fragments[ fragmentCacheKey( keyPath ) ] = {
					isDirty: false,
					isLoading: false,
					error: false,
					html: 'old fragment'
				};
			} );

			afterEach( () => {
				jest.useRealTimers();
			} );

			it( 'sets fragment as dirty after debounce', () => {
				store.setDirtyFragment( childKeyPath );

				// Doesn't set dirty immediately but waits for debounce
				expect( store.fragments[ fragmentCacheKey( keyPath ) ].isDirty ).toBe( false );

				// Sets dirty after debounce timer goes off
				jest.advanceTimersByTime( debounceTime );
				expect( store.fragments[ fragmentCacheKey( keyPath ) ].isDirty ).toBe( true );
			} );

			it( 'does nothing if fragment is not initialized', () => {
				store.fragments = {};

				store.setDirtyFragment( childKeyPath );
				jest.runAllTimers();

				expect( store.fragments ).toEqual( {} );
			} );

			it( 'debounces multiple calls', () => {
				store.fragments[ fragmentCacheKey( keyPath ) ] = {
					isDirty: false,
					isLoading: false,
					error: false,
					html: 'old fragment'
				};
				store.setDirtyFragment( childKeyPath );
				store.setDirtyFragment( childKeyPath );
				store.setDirtyFragment( childKeyPath );

				jest.advanceTimersByTime( debounceTime );

				expect( store.fragments[ fragmentCacheKey( keyPath ) ].isDirty ).toBe( true );
			} );
		} );

		describe( 'swapFragmentPreviews', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments';

			beforeEach( () => {
				store.fragments = {};
				store.fragments[ fragmentCacheKey( `${ keyPath }.1` ) ] = {
					isDirty: false,
					isLoading: false,
					error: false,
					html: 'fragment 1'
				};
				store.fragments[ fragmentCacheKey( `${ keyPath }.2` ) ] = {
					isDirty: false,
					isLoading: false,
					error: false,
					html: 'fragment 2'
				};
				store.fragments[ fragmentCacheKey( `${ keyPath }.3` ) ] = {
					isDirty: false,
					isLoading: false,
					error: false,
					html: 'fragment 3'
				};
			} );

			it( 'throws error if first keyPath does not exist', () => {
				expect( () => {
					store.swapFragmentPreviews( `${ keyPath }.4`, `${ keyPath }.3` );
				} ).toThrowError();
			} );

			it( 'throws error if second keyPath does not exist', () => {
				expect( () => {
					store.swapFragmentPreviews( `${ keyPath }.3`, `${ keyPath }.4` );
				} ).toThrowError();
			} );

			it( 'swaps two given fragment previews', () => {
				store.swapFragmentPreviews( `${ keyPath }.1`, `${ keyPath }.2` );

				expect( store.fragments[ fragmentCacheKey( `${ keyPath }.1` ) ].html ).toBe( 'fragment 2' );
				expect( store.fragments[ fragmentCacheKey( `${ keyPath }.2` ) ].html ).toBe( 'fragment 1' );
			} );
		} );

		describe( 'shiftFragmentPreviews', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments';

			beforeEach( () => {
				store.fragments = {};
				store.fragments[ fragmentCacheKey( `${ keyPath }.1` ) ] = {
					isDirty: false,
					isLoading: false,
					error: false,
					html: 'fragment 1'
				};
				store.fragments[ fragmentCacheKey( `${ keyPath }.2` ) ] = {
					isDirty: false,
					isLoading: false,
					error: false,
					html: 'fragment 2'
				};
				store.fragments[ fragmentCacheKey( `${ keyPath }.3` ) ] = {
					isDirty: false,
					isLoading: false,
					error: false,
					html: 'fragment 3'
				};
			} );

			it( 'throws error if offset is not a number', () => {
				expect( () => {
					store.shiftFragmentPreviews( `${ keyPath }.2`, null );
				} ).toThrowError();
			} );

			it( 'throws error if keyPath is not a list item', () => {
				expect( () => {
					store.shiftFragmentPreviews( `${ keyPath }.2.Z444K1`, 1 );
				} ).toThrowError();
			} );

			it( 'shifts two items one position forward', () => {
				store.shiftFragmentPreviews( `${ keyPath }.2`, 1 );

				expect( store.fragments[ fragmentCacheKey( `${ keyPath }.2` ) ] ).toBeUndefined();
				expect( store.fragments[ fragmentCacheKey( `${ keyPath }.3` ) ].html ).toBe( 'fragment 2' );
				expect( store.fragments[ fragmentCacheKey( `${ keyPath }.4` ) ].html ).toBe( 'fragment 3' );
			} );

			it( 'shifts two items one position back', () => {
				store.shiftFragmentPreviews( `${ keyPath }.2`, -1 );

				expect( store.fragments[ fragmentCacheKey( `${ keyPath }.1` ) ].html ).toBe( 'fragment 2' );
				expect( store.fragments[ fragmentCacheKey( `${ keyPath }.2` ) ].html ).toBe( 'fragment 3' );
				expect( store.fragments[ fragmentCacheKey( `${ keyPath }.3` ) ] ).toBeUndefined();
			} );
		} );

		describe( 'setHighlightedFragment', () => {
			it( 'sets keyPath as highligted fragment', () => {
				const keyPath = 'abstractwiki.sections.Q8776414.fragments';
				store.setHighlightedFragment( keyPath );

				expect( store.highlight ).toBe( keyPath );
			} );

			it( 'unsets highligted fragment', () => {
				const keyPath = 'abstractwiki.sections.Q8776414.fragments';
				store.highlight = keyPath;

				store.setHighlightedFragment( undefined );

				expect( store.highlight ).toBeUndefined();
			} );
		} );

		describe( 'setSuggestedHtmlFunctions', () => {
			it( 'sets list of suggested function zids', () => {
				store.setSuggestedHtmlFunctions( [ 'Z10001', 'Z10002' ] );
				expect( store.suggestedHtmlFunctions ).toEqual( [ 'Z10001', 'Z10002' ] );
			} );
		} );
	} );
} );
