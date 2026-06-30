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
const ApiError = require( '../../../../resources/ext.wikilambda.app/store/classes/ApiError.js' );

const mockLang = 'Z1002';
const mockDate = '26-7-2023';
const mockQid = 'Q96807071';
const ledeQid = 'Q8776414';

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

		store.fragments = {};
		store.fragmentPromises = {};
		store.sectionHashes = {};
		store.qid = undefined;
		store.highlight = undefined;
		store.previewLanguageZid = mockLang;

		Object.defineProperty( store, 'getUserLangZid', { value: 'Z1003' } );
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

		describe( 'getAbstractSectionHashes', () => {
			it( 'returns empty array if section has no hashes', () => {
				store.sectionHashes = {};
				expect( store.getAbstractSectionHashes( ledeQid ) ).toEqual( [] );
			} );

			it( 'returns the hashes for a given section', () => {
				store.sectionHashes = {
					[ ledeQid ]: [ 'hash1', 'hash2', 'hash3' ]
				};
				expect( store.getAbstractSectionHashes( ledeQid ) ).toEqual( [ 'hash1', 'hash2', 'hash3' ] );
			} );

			it( 'returns empty array for an unknown section', () => {
				store.sectionHashes = {
					[ ledeQid ]: [ 'hash1', 'hash2' ]
				};
				expect( store.getAbstractSectionHashes( 'Q9999' ) ).toEqual( [] );
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
				expect( store.getFragmentPreview( 'hash', 'Z1002' ) ).toBeUndefined();
			} );

			it( 'returns the stored fragment preview for a given language', () => {
				const fragmentPreview = {
					hasError: false,
					isDirty: false,
					isLoading: false,
					error: null,
					html: '<b>Preview</b>'
				};
				store.fragments = {
					'some-hash:Z1002': fragmentPreview
				};
				expect( store.getFragmentPreview( 'some-hash', 'Z1002' ) ).toEqual( fragmentPreview );
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

		describe( 'getPendingCount', () => {
			it( 'returns false if section has no hashes', () => {
				store.sectionHashes = {};
				expect( store.getPendingCount( 'Q101', 'Z1002' ) ).toBe( false );
			} );

			it( 'returns 0 if all fragments are rendered', () => {
				store.sectionHashes = {
					Q101: [ 'hash1', 'hash2' ]
				};
				store.fragments = {
					'hash1:Z1002': { isPending: false, html: 'rendered' },
					'hash2:Z1002': { isPending: false, html: 'rendered' }
				};
				expect( store.getPendingCount( 'Q101', 'Z1002' ) ).toBe( 0 );
			} );

			it( 'returns count of missing fragments', () => {
				store.sectionHashes = {
					Q101: [ 'hash1', 'hash2', 'hash3' ]
				};
				store.fragments = {
					'hash1:Z1002': { isPending: false, html: 'rendered' }
				};
				expect( store.getPendingCount( 'Q101', 'Z1002' ) ).toBe( 2 );
			} );

			it( 'returns count of pending fragments', () => {
				store.sectionHashes = {
					Q101: [ 'hash1', 'hash2', 'hash3' ]
				};
				store.fragments = {
					'hash1:Z1002': { isPending: false, html: 'rendered' },
					'hash2:Z1002': { isPending: true },
					'hash3:Z1002': { isPending: true }
				};
				expect( store.getPendingCount( 'Q101', 'Z1002' ) ).toBe( 2 );
			} );

			it( 'returns count of both missing and pending fragments', () => {
				store.sectionHashes = {
					Q101: [ 'hash1', 'hash2' ]
				};
				store.fragments = {
					'hash1:Z1002': { isPending: false, html: 'rendered' },
					'hash2:Z1002': { isPending: false, html: 'rendered' },
					'hash1:Z1003': { isPending: true }
				};
				expect( store.getPendingCount( 'Q101', 'Z1003' ) ).toBe( 2 );
			} );
		} );

		describe( 'isSectionPending', () => {
			it( 'returns false if getPendingCount returns 0', () => {
				Object.defineProperty( store, 'getPendingCount', {
					value: jest.fn( () => 0 )
				} );
				expect( store.isSectionPending( 'Q101', 'Z1002' ) ).toBe( false );
			} );

			it( 'returns true if getPendingCount returns a positive number', () => {
				Object.defineProperty( store, 'getPendingCount', {
					value: jest.fn( () => 2 )
				} );
				expect( store.isSectionPending( 'Q101', 'Z1002' ) ).toBe( true );
			} );
		} );

		describe( 'isLanguageSeen', () => {
			it( 'returns false if fragments is empty', () => {
				store.fragments = {};
				expect( store.isLanguageSeen( 'Z1002' ) ).toBe( false );
			} );

			it( 'returns true if language is present in fragments', () => {
				store.fragments = {
					'hash1:Z1002': { isPending: false, html: 'rendered' }
				};
				expect( store.isLanguageSeen( 'Z1002' ) ).toBe( true );
			} );

			it( 'returns false if language is not present in fragments', () => {
				store.fragments = {
					'hash1:Z1002': { isPending: false, html: 'rendered' }
				};
				expect( store.isLanguageSeen( 'Z1003' ) ).toBe( false );
			} );

			it( 'returns true if language is present among multiple languages', () => {
				store.fragments = {
					'hash1:Z1002': { isPending: false, html: 'rendered' },
					'hash1:Z1003': { isPending: false, html: 'rendered' },
					'hash2:Z1002': { isPending: false, html: 'rendered' }
				};
				expect( store.isLanguageSeen( 'Z1003' ) ).toBe( true );
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

		describe( 'setAbstractSectionHashes', () => {
			beforeEach( () => {
				store.sectionHashes = {};
			} );

			it( 'sets the array of hashes for a given qid', () => {
				store.setAbstractSectionHashes( 'Q101', [ 'hash1', 'hash2', 'hash3' ] );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'hash1', 'hash2', 'hash3' ] );
			} );

			it( 'overwrites existing data only for the given hash', () => {
				store.sectionHashes = { Q101: [ 'oldhash' ], Q102: [ 'goodhash' ] };

				store.setAbstractSectionHashes( 'Q101', [ 'hash1', 'hash2', 'hash3' ] );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'hash1', 'hash2', 'hash3' ] );
				expect( store.sectionHashes.Q102 ).toEqual( [ 'goodhash' ] );
			} );
		} );

		describe( 'setAbstractFragmentHash', () => {
			beforeEach( () => {
				store.sectionHashes = {};
			} );

			it( 'initializes the section and sets the hash if section did not exist', () => {
				store.setAbstractFragmentHash( 'Q101', 0, 'hash1' );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'hash1' ] );
			} );

			it( 'sets the hash at the given index for an existing section', () => {
				store.sectionHashes = { Q101: [ 'hash1', 'hash2', 'hash3' ] };
				store.setAbstractFragmentHash( 'Q101', 1, 'newhash' );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'hash1', 'newhash', 'hash3' ] );
			} );

			it( 'does not overwrite other sections', () => {
				store.sectionHashes = { Q101: [ 'hash1' ], Q102: [ 'goodhash' ] };
				store.setAbstractFragmentHash( 'Q101', 0, 'newhash' );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'newhash' ] );
				expect( store.sectionHashes.Q102 ).toEqual( [ 'goodhash' ] );
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
				// Mock mw.config.get to inject the suggested-Wikifunctions list
				// that ClientHooks::onMakeGlobalVariablesScript would emit at runtime.
				const originalConfigGet = global.mw.config.get.getMockImplementation();
				global.mw.config.get.mockImplementation( ( key ) => {
					if ( key === 'wgWikiLambdaAbstractSuggestions' ) {
						return [ 'Z10001', 'badzid', 'Z10002' ];
					}
					return originalConfigGet ? originalConfigGet( key ) : null;
				} );
			} );

			it( 'initializes the Abstract Wiki content', async () => {
				// Call initialize and await for resolution
				await store.initializeAbstractWikiContent();

				// Content is transformed to hybrid and stored
				const transformedContent = {
					namespace: 'abstractwiki',
					zobject: mockAbstractContentHybrid
				};
				expect( store.setJsonObject ).toHaveBeenCalledWith( transformedContent );

				// Qid is set from title
				expect( store.setAbstractWikiId ).toHaveBeenCalledWith( mockQid );

				// Suggested functions are initialized
				expect( store.setSuggestedHtmlFunctions ).toHaveBeenCalledWith( [ 'Z10001', 'Z10002' ] );

				// Zids are extracted and fetched
				const extractedZids = { zids: [ 'Z1', 'Z9', 'Z89', 'Z7', 'Z444', 'Z6', 'Z10001', 'Z10002' ] };
				expect( store.fetchZids ).toHaveBeenCalledWith( extractedZids );

				// Qids are extracted from content
				const extractedQids = { ids: [ mockQid, ledeQid ] };
				expect( store.fetchItems ).toHaveBeenCalledWith( extractedQids );

				// Preview language set from fallback chain
				expect( store.previewLanguageZid ).toBe( mockLang );

				// Set page as initialized
				expect( store.setInitialized ).toHaveBeenCalledWith( true );

				// Fragment hashes for each section are initialized
				expect( store.sectionHashes ).toHaveProperty( 'Q8776414' );
				expect( store.sectionHashes.Q8776414.length ).toBe( 1 );
			} );

			it( 'also prefetches the page title qid when creating a new Abstract Article', async () => {
				// Override WikiLambdaConfig for "new page" case (qid placeholder)
				Object.defineProperty( store, 'getWikilambdaConfig', {
					value: {
						title: mockQid,
						content: JSON.stringify( {
							...mockEmptyAbstractContent,
							qid: Constants.ABSTRACT_WIKI_NEW_QID_PLACEHOLDER
						} )
					}
				} );

				await store.initializeAbstractWikiContent();

				// Qids from content plus the title qid are fetched
				const extractedQidsNew = { ids: [ ledeQid, mockQid ] };
				expect( store.fetchItems ).toHaveBeenCalledWith( extractedQidsNew );
			} );

			it( 'sets the abstract wiki Id in the content when creating new content', async () => {
				// Override WikiLambdaConfig for "new page" case (qid placeholder)
				Object.defineProperty( store, 'getWikilambdaConfig', {
					value: {
						title: mockQid,
						content: JSON.stringify( {
							...mockEmptyAbstractContent,
							qid: Constants.ABSTRACT_WIKI_NEW_QID_PLACEHOLDER
						} )
					}
				} );

				// Call initialize and await for resolution
				await store.initializeAbstractWikiContent();

				expect( store.setJsonObject ).toHaveBeenCalled();
				expect( store.setAbstractWikiId ).toHaveBeenCalledWith( mockQid );

				const setJsonObjectOrder = store.setJsonObject.mock.invocationCallOrder[ 0 ];
				const setAbstractWikiIdOrder = store.setAbstractWikiId.mock.invocationCallOrder[ 0 ];

				expect( setJsonObjectOrder ).toBeLessThan( setAbstractWikiIdOrder );
			} );
		} );

		describe( 'setPreviewLanguageZid', () => {
			it( 'sets the preview language ZID', () => {
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

		describe( 'onlyNeededFragments', () => {
			const keys = [
				'hash1:Z1002',
				'hash2:Z1002',
				'hash3:Z1002'
			];
			const fragments = [
				{ Z1K1: 'Z7', Z7K1: 'Z401' },
				{ Z1K1: 'Z7', Z7K1: 'Z402' },
				{ Z1K1: 'Z7', Z7K1: 'Z403' }
			];

			beforeEach( () => {
				Object.defineProperty( store, 'getViewMode', { value: false, configurable: true } );
			} );

			it( 'in view mode returns all keys and undefined fragments', () => {
				Object.defineProperty( store, 'getViewMode', { value: true, configurable: true } );
				const [ neededKeys, neededFragments ] = store.onlyNeededFragments( keys, fragments, 'Z1002' );
				expect( neededKeys ).toEqual( keys );
				expect( neededFragments ).toBeUndefined();
			} );

			it( 'returns all keys and canonicalized fragments if language was never seen', () => {
				store.fragments = {};
				const [ neededKeys, neededFragments ] = store.onlyNeededFragments( keys, fragments, 'Z1002' );
				expect( neededKeys ).toEqual( keys );
				expect( neededFragments ).toHaveLength( 3 );
			} );

			it( 'returns missing and pending fragments if language was seen', () => {
				store.fragments = {
					'hash1:Z1002': { isPending: false, html: 'rendered' },
					'hash2:Z1002': { isPending: true }
					/* hash3 missing */
				};
				const [ neededKeys, neededFragments ] = store.onlyNeededFragments( keys, fragments, 'Z1002' );
				expect( neededKeys ).toEqual( [ 'hash2:Z1002', 'hash3:Z1002' ] );
				expect( neededFragments ).toHaveLength( 2 );
			} );

			it( 'returns empty arrays if all fragments are rendered', () => {
				store.fragments = {
					'hash1:Z1002': { isPending: false, html: 'rendered' },
					'hash2:Z1002': { isPending: false, html: 'rendered' },
					'hash3:Z1002': { isPending: false, html: 'rendered' }
				};
				const [ neededKeys, neededFragments ] = store.onlyNeededFragments( keys, fragments, 'Z1002' );
				expect( neededKeys ).toEqual( [] );
				expect( neededFragments ).toEqual( [] );
			} );
		} );

		describe( 'fetchSectionPreview', () => {
			const fragments = [
				{ Z1K1: 'Z7', Z7K1: 'Z401' },
				{ Z1K1: 'Z7', Z7K1: 'Z402' }
			];
			const fragmentHashes = [ 'hash1', 'hash2' ];

			let postMock;
			let getMock;
			let getTokenMock;

			beforeEach( () => {
				store.fragments = {};
				store.fragmentPromises = {};

				store.setError = jest.fn();
				store.processFragmentResponse = jest.fn();

				Object.defineProperty( store, 'getViewMode', { value: false, configurable: true } );

				const response = {
					abstractwiki_fetch_section: {
						[ ledeQid ]: [
							{ success: true, value: '<p>Fragment 1</p>' },
							{ success: true, value: '<p>Fragment 2</p>' }
						]
					}
				};
				postMock = jest.fn().mockResolvedValue( response );
				getMock = jest.fn().mockResolvedValue( response );
				getTokenMock = jest.fn().mockResolvedValue( 'csrf-token' );
				mw.Api = jest.fn( () => ( {
					get: getMock,
					getToken: getTokenMock,
					post: postMock
				} ) );
			} );

			it( 'does nothing if view mode, language seen and section not pending', async () => {
				Object.defineProperty( store, 'getViewMode', { value: true } );
				Object.defineProperty( store, 'isSectionPending', { value: jest.fn( () => false ) } );

				store.fragments = { [ `hash1:${ mockLang }` ]: { isPending: false, html: 'rendered' } };

				await store.fetchSectionPreview( { mockQid, section: ledeQid, language: mockLang, mockDate, fragments, fragmentHashes } );

				expect( postMock ).not.toHaveBeenCalled();
			} );

			it( 'does nothing if all requested fragments are already available', async () => {
				store.fragments = {
					[ `hash1:${ mockLang }` ]: { isPending: false, html: 'rendered' },
					[ `hash2:${ mockLang }` ]: { isPending: false, html: 'rendered' }
				};

				await store.fetchSectionPreview( {
					topic: mockQid,
					section: ledeQid,
					language: mockLang,
					date: mockDate,
					fragments,
					fragmentHashes
				} );

				expect( postMock ).not.toHaveBeenCalled();
			} );

			it( 'sets fragments as loading before the request', async () => {
				await store.fetchSectionPreview( {
					topic: mockQid,
					section: ledeQid,
					language: mockLang,
					date: mockDate,
					fragments,
					fragmentHashes
				} );

				expect( store.fragments[ `hash1:${ mockLang }` ] ).toHaveProperty( 'isLoading' );
				expect( store.fragments[ `hash2:${ mockLang }` ] ).toHaveProperty( 'isLoading' );
			} );

			it( 'makes the API call as a GET with no fragments in view mode', async () => {
				Object.defineProperty( store, 'getViewMode', { value: true } );

				await store.fetchSectionPreview( {
					topic: mockQid,
					section: ledeQid,
					language: mockLang,
					date: mockDate,
					fragments,
					fragmentHashes
				} );

				// The persisted-fragment read is idempotent, so it is issued as a
				// cacheable GET rather than a POST.
				expect( postMock ).not.toHaveBeenCalled();
				expect( getMock ).toHaveBeenCalledWith( {
					action: 'abstractwiki_fetch_section',
					format: 'json',
					formatversion: '2',
					abstractwiki_fetch_section_topic: mockQid,
					abstractwiki_fetch_section_section: ledeQid,
					abstractwiki_fetch_section_language: mockLang,
					abstractwiki_fetch_section_date: mockDate
				}, { signal: undefined } );
			} );

			it( 'makes the API call as a POST with a fragments array in edit mode', async () => {
				await store.fetchSectionPreview( {
					topic: mockQid,
					section: ledeQid,
					language: mockLang,
					date: mockDate,
					fragments,
					fragmentHashes
				} );

				const expectedFragments = JSON.stringify( fragments );

				// Rendering unsaved fragments is a write under an elevated right, so
				// it stays a POST rather than the read path's GET.
				expect( getMock ).not.toHaveBeenCalled();
				expect( postMock ).toHaveBeenCalledWith( {
					action: 'abstractwiki_fetch_section',
					format: 'json',
					formatversion: '2',
					abstractwiki_fetch_section_topic: mockQid,
					abstractwiki_fetch_section_section: ledeQid,
					abstractwiki_fetch_section_language: mockLang,
					abstractwiki_fetch_section_date: mockDate,
					abstractwiki_fetch_section_token: 'csrf-token',
					abstractwiki_fetch_section_fragments: expectedFragments
				}, { signal: undefined } );
			} );

			it( 'makes the API call with a filtered fragments array in edit mode', async () => {
				store.fragments = {
					[ `hash1:${ mockLang }` ]: { isPending: false, html: 'rendered' },
					[ `hash2:${ mockLang }` ]: { isPending: true }
				};

				await store.fetchSectionPreview( {
					topic: mockQid,
					section: ledeQid,
					language: mockLang,
					date: mockDate,
					fragments,
					fragmentHashes
				} );

				// hash1 fragment is ready, hash2 fragment will be requested
				const expectedFragments = JSON.stringify( [ fragments[ 1 ] ] );

				expect( postMock ).toHaveBeenCalledWith( {
					action: 'abstractwiki_fetch_section',
					format: 'json',
					formatversion: '2',
					abstractwiki_fetch_section_topic: mockQid,
					abstractwiki_fetch_section_section: ledeQid,
					abstractwiki_fetch_section_language: mockLang,
					abstractwiki_fetch_section_date: mockDate,
					abstractwiki_fetch_section_token: 'csrf-token',
					abstractwiki_fetch_section_fragments: expectedFragments
				}, { signal: undefined } );
			} );

			it( 'processes each fragmnet response on success', async () => {
				await store.fetchSectionPreview( {
					topic: mockQid,
					section: ledeQid,
					language: mockLang,
					date: mockDate,
					fragments,
					fragmentHashes
				} );

				expect( store.processFragmentResponse ).toHaveBeenCalledTimes( 2 );
				expect( store.processFragmentResponse ).toHaveBeenCalledWith(
					`hash1:${ mockLang }`,
					{ success: true, value: '<p>Fragment 1</p>' }
				);
				expect( store.processFragmentResponse ).toHaveBeenCalledWith(
					`hash2:${ mockLang }`,
					{ success: true, value: '<p>Fragment 2</p>' }
				);
			} );

			it( 'sets error if response length does not match requested fragment count (fragmentKeys)', async () => {
				postMock = jest.fn().mockResolvedValue( {
					[ ledeQid ]: [ { success: true, value: '<p>Fragment 1</p>' } ]
				} );
				mw.Api = jest.fn( () => ( { post: postMock, getToken: getTokenMock } ) );

				await store.fetchSectionPreview( {
					topic: mockQid,
					section: ledeQid,
					language: mockLang,
					date: mockDate,
					fragments,
					fragmentHashes
				} );

				expect( store.setError ).toHaveBeenCalled();
				expect( store.processFragmentResponse ).not.toHaveBeenCalled();
			} );

			it( 'sets error on API failure', async () => {
				postMock = jest.fn().mockRejectedValue( new ApiError( 'error-code', { error: { message: 'error!' } } ) );
				mw.Api = jest.fn( () => ( { post: postMock, getToken: getTokenMock } ) );

				await store.fetchSectionPreview( {
					topic: mockQid,
					section: ledeQid,
					language: mockLang,
					date: mockDate,
					fragments,
					fragmentHashes
				} );

				expect( store.setError ).toHaveBeenCalled();
			} );

			it( 'clears loading state and promises in finally', async () => {
				await store.fetchSectionPreview( {
					topic: mockQid,
					section: ledeQid,
					language: mockLang,
					date: mockDate,
					fragments,
					fragmentHashes
				} );

				expect( store.fragments[ `hash1:${ mockLang }` ].isLoading ).toBe( false );
				expect( store.fragments[ `hash2:${ mockLang }` ].isLoading ).toBe( false );
				expect( store.fragmentPromises[ `hash1:${ mockLang }` ] ).toBeUndefined();
				expect( store.fragmentPromises[ `hash2:${ mockLang }` ] ).toBeUndefined();
			} );
		} );

		describe( 'processFragmentResponse', () => {
			const fragmentKey = `hash1:${ mockLang }`;

			beforeEach( () => {
				store.fragments = {
					[ fragmentKey ]: {
						isPending: false,
						isLoading: false,
						hasError: false,
						html: 'old fragment',
						retryCount: 0
					}
				};

				store.setRenderedFragment = jest.fn();
				store.enqueueFragmentPreview = jest.fn();
				store.fetchZids = jest.fn();

				jest.useFakeTimers();
			} );

			afterEach( () => {
				jest.useRealTimers();
			} );

			it( 'processes a successful fragment and calls the setter', () => {
				const result = { success: true, value: '<p>rendered</p>' };

				store.processFragmentResponse( fragmentKey, result );

				expect( store.setRenderedFragment ).toHaveBeenCalledWith( fragmentKey, {
					language: mockLang,
					html: '<p>rendered</p>',
					isPending: false
				} );
			} );

			it( 'processes a pending fragment and calls the setter (if no retry)', () => {
				const result = { success: true, pending: true };

				store.processFragmentResponse( fragmentKey, result );

				expect( store.setRenderedFragment ).toHaveBeenCalledWith( fragmentKey, {
					language: mockLang,
					isPending: true
				} );

				// Also make sure there's no retries
				expect( store.enqueueFragmentPreview ).not.toHaveBeenCalled();
			} );

			it( 'processes a pending fragment and enqueues retry job if under max retries', () => {
				const result = { success: true, pending: true };
				const job = jest.fn();

				store.processFragmentResponse( fragmentKey, result, job );

				expect( store.fragments[ fragmentKey ].retryCount ).toBe( 1 );
				expect( store.setRenderedFragment ).not.toHaveBeenCalled();

				// Assert that a job has been enqueued after the first-retry backoff
				// delay (INITIAL_RETRY_DELAY = 2000ms for retryCount === 1).
				jest.advanceTimersByTime( 2100 );

				expect( store.enqueueFragmentPreview ).toHaveBeenCalledTimes( 1 );
				store.enqueueFragmentPreview.mock.calls[ 0 ][ 0 ]();
				expect( job ).toHaveBeenCalled();
			} );

			it( 'sets fragment as pending if max retries reached', () => {
				store.fragments[ fragmentKey ].retryCount = 2;
				const result = { success: true, pending: true };
				const job = jest.fn();

				store.processFragmentResponse( fragmentKey, result, job );

				expect( store.fragments[ fragmentKey ].retryCount ).toBe( 3 );
				expect( store.setRenderedFragment ).toHaveBeenCalledWith( fragmentKey, {
					language: mockLang,
					isPending: true
				} );

				// Advance the counter 2000 * 2^(retryCount-1) = 8000 to make sure that
				// no job is retried after the timer with the back off factor goes off
				jest.advanceTimersByTime( 8100 );
				expect( store.enqueueFragmentPreview ).not.toHaveBeenCalled();
			} );

			it( 'sets error with code and zid when failed fragment contains zerror', () => {
				const result = {
					success: false,
					value: {
						msg: 'apierror-abstractwiki_run_fragment-returned-zerror',
						httpStatusCode: 400,
						zerror: { Z1K1: 'Z5' },
						params: [ 'Z500' ]
					}
				};

				store.processFragmentResponse( fragmentKey, result );

				// Check that we asynchronously fetch the error zid for its label
				expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z500' ] } );

				expect( store.setRenderedFragment ).toHaveBeenCalledWith( fragmentKey, {
					language: mockLang,
					error: {
						type: Constants.ERROR_TYPES.ERROR,
						retry: false,
						code: 'apierror-abstractwiki_run_fragment-returned-zerror',
						zid: 'Z500'
					}
				} );
			} );

			it( 'sets fragment with unknown error', () => {
				const result = {
					success: false,
					value: { info: 'some unpredictable error structure' }
				};

				store.processFragmentResponse( fragmentKey, result );

				expect( store.setRenderedFragment ).toHaveBeenCalledWith( fragmentKey, {
					language: mockLang,
					error: {
						type: Constants.ERROR_TYPES.ERROR,
						retry: false,
						text: 'Unable to render this fragment due to an unknown error.'
					}
				} );
			} );
		} );

		describe( 'enqueueFragmentPreview', () => {
			beforeEach( () => {
				store.fragmentQueue = [];
				store.processFragmentQueue = jest.fn();
			} );

			it( 'adds a new job to the queue', () => {
				const mockJob = jest.fn().mockReturnValue( 'the right job!' );

				store.enqueueFragmentPreview( mockJob );

				expect( store.fragmentQueue.length ).toBe( 1 );
				expect( store.fragmentQueue[ 0 ]() ).toBe( 'the right job!' );
				expect( store.processFragmentQueue ).toHaveBeenCalled();
			} );
		} );

		describe( 'processFragmentQueue', () => {
			beforeEach( () => {
				jest.useFakeTimers();

				store.queueRunning = false;
				store.fragmentQueue = [];
			} );

			afterEach( () => {
				jest.useRealTimers();
			} );

			it( 'does nothing if queue is already running', () => {
				store.queueRunning = true;

				const job = jest.fn();
				store.fragmentQueue.push( job );

				store.processFragmentQueue();

				expect( job ).not.toHaveBeenCalled();
			} );

			it( 'runs the first job immediately', () => {
				const job = jest.fn();
				store.fragmentQueue.push( job );

				store.processFragmentQueue();

				expect( job ).toHaveBeenCalledTimes( 1 );
				expect( store.queueRunning ).toBe( true );
			} );

			it( 'processes multiple jobs sequentially', () => {
				const job1 = jest.fn();
				const job2 = jest.fn();
				store.fragmentQueue.push( job1, job2 );

				store.processFragmentQueue();

				expect( job1 ).toHaveBeenCalledTimes( 1 );
				expect( job2 ).not.toHaveBeenCalled();

				jest.advanceTimersByTime( 2500 );

				expect( job2 ).toHaveBeenCalledTimes( 1 );
			} );

			it( 'stops when queue becomes empty', () => {
				const job = jest.fn();
				store.fragmentQueue.push( job );

				store.processFragmentQueue();

				expect( store.queueRunning ).toBe( true );

				jest.advanceTimersByTime( 2500 );

				expect( store.queueRunning ).toBe( false );
			} );
		} );

		describe( 'renderFragmentPreview', () => {
			const fragmentKey = `suchgood#:${ mockLang }`;
			const payload = {
				fragmentHash: 'suchgood#',
				qid: mockQid,
				language: mockLang,
				date: mockDate,
				fragment: fragmentsOf( mockAbstractContentHybrid )[ 1 ]
			};

			beforeEach( () => {
				store.fragments = {
					[ fragmentKey ]: {
						hasError: false,
						isLoading: false,
						error: null,
						html: 'old fragment'
					}
				};

				store.requestFragmentPreview = jest.fn();
				store.enqueueFragmentPreview = jest.fn();
			} );

			it( 'does not render again if there is a request in flight', async () => {
				store.fragmentPromises[ fragmentKey ] = Promise.resolve();

				await store.renderFragmentPreview( payload );

				expect( store.enqueueFragmentPreview ).not.toHaveBeenCalled();
			} );

			it( 'does not render again if fragment is loading', async () => {
				store.fragments[ fragmentKey ].isLoading = true;

				await store.renderFragmentPreview( payload );

				expect( store.enqueueFragmentPreview ).not.toHaveBeenCalled();
			} );

			it( 'sets loading state when ongoing render call', () => {
				store.fragments[ fragmentKey ].isLoading = undefined;

				store.renderFragmentPreview( payload );

				expect( store.enqueueFragmentPreview ).toHaveBeenCalled();
				expect( store.fragments[ fragmentKey ].isLoading ).toBe( true );
			} );

			it( 'adds new request job to the queue', () => {
				store.renderFragmentPreview( payload );

				expect( store.enqueueFragmentPreview ).toHaveBeenCalledTimes( 1 );

				const job = store.enqueueFragmentPreview.mock.calls[ 0 ][ 0 ];
				job();

				expect( store.requestFragmentPreview ).toHaveBeenCalledWith( payload, job );
			} );
		} );

		describe( 'requestFragmentPreview', () => {
			let getMock;
			let retryJob;

			const fragmentKey = `suchgood#:${ mockLang }`;
			const payload = {
				fragmentHash: 'suchgood#',
				qid: mockQid,
				language: mockLang,
				date: mockDate,
				fragment: fragmentsOf( mockAbstractContentHybrid )[ 1 ]
			};

			beforeEach( () => {
				store.fragments = {
					[ fragmentKey ]: {
						hasError: false,
						isDirty: true,
						isLoading: false,
						retryCount: 0,
						error: null,
						html: 'old fragment'
					}
				};

				retryJob = jest.fn();
				store.setRenderedFragment = jest.fn();
				store.processFragmentResponse = jest.fn();

				// Mock Api GET abstractwiki_run_fragment
				getMock = jest.fn().mockResolvedValue( {
					abstractwiki_run_fragment: { success: true, value: 'rendered fragment' }
				} );
				mw.Api = jest.fn( () => ( {
					get: getMock
				} ) );
			} );

			it( 'runs run fragment and stores successful response', async () => {
				await store.requestFragmentPreview( payload, retryJob );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'abstractwiki_run_fragment',
					format: 'json',
					formatversion: '2',
					abstractwiki_run_fragment_qid: mockQid,
					abstractwiki_run_fragment_language: mockLang,
					abstractwiki_run_fragment_date: mockDate,
					abstractwiki_run_fragment_fragment: JSON.stringify( fragmentsOf( mockAbstractContent )[ 1 ] )
				}, { signal: undefined } );

				expect( store.processFragmentResponse ).toHaveBeenCalledWith(
					fragmentKey,
					{ success: true, value: 'rendered fragment' },
					retryJob
				);
			} );

			it( 'runs render fragment and stores failed unknown response (no retry)', async () => {
				getMock = jest.fn().mockRejectedValue( new ApiError( 'http', { error: { message: 'error!' } }, 400 ) );
				mw.Api = jest.fn( () => ( { get: getMock } ) );

				await store.requestFragmentPreview( payload, retryJob );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'abstractwiki_run_fragment',
					format: 'json',
					formatversion: '2',
					abstractwiki_run_fragment_qid: mockQid,
					abstractwiki_run_fragment_language: mockLang,
					abstractwiki_run_fragment_date: mockDate,
					abstractwiki_run_fragment_fragment: JSON.stringify( fragmentsOf( mockAbstractContent )[ 1 ] )
				}, { signal: undefined } );

				expect( store.setRenderedFragment ).toHaveBeenCalledWith(
					fragmentKey,
					{ error: { retry: false, text: 'error!', type: 'error' } }
				);
			} );

			it( 'runs render fragment and stores failed unknown response (show retry)', async () => {
				getMock = jest.fn().mockRejectedValue( new ApiError( 'http', { error: { message: 'error!' } }, 503 ) );
				mw.Api = jest.fn( () => ( { get: getMock } ) );

				await store.requestFragmentPreview( payload, retryJob );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'abstractwiki_run_fragment',
					format: 'json',
					formatversion: '2',
					abstractwiki_run_fragment_qid: mockQid,
					abstractwiki_run_fragment_language: mockLang,
					abstractwiki_run_fragment_date: mockDate,
					abstractwiki_run_fragment_fragment: JSON.stringify( fragmentsOf( mockAbstractContent )[ 1 ] )
				}, { signal: undefined } );

				expect( store.setRenderedFragment ).toHaveBeenCalledWith(
					fragmentKey,
					{ error: { retry: true, text: 'error!', type: 'error' } }
				);
			} );
		} );

		describe( 'setRenderedFragment', () => {
			const fragmentKey = `suchgood#:${ mockLang }`;

			beforeEach( () => {
				store.fragments = {
					[ fragmentKey ]: {
						retryCount: 0,
						html: 'old fragment'
					}
				};
			} );

			it( 'sets successful rendered fragment', () => {
				store.setRenderedFragment( fragmentKey, {
					html: 'some rendered fragment'
				} );

				expect( store.fragments[ fragmentKey ] ).toEqual( {
					hasError: false,
					isLoading: false,
					isPending: false,
					retryCount: 0,
					error: null,
					html: 'some rendered fragment'
				} );
			} );

			it( 'sets failed rendered fragment with error text', () => {
				store.setRenderedFragment( fragmentKey, {
					error: {
						text: 'Some error message'
					}
				} );

				expect( store.fragments[ fragmentKey ] ).toEqual( {
					hasError: true,
					isLoading: false,
					isPending: false,
					retryCount: 0,
					error: {
						text: 'Some error message'
					},
					html: ''
				} );
			} );

			it( 'sets failed rendered fragment with zerror', () => {
				store.setRenderedFragment( fragmentKey, {
					error: {
						code: 'error-code',
						zid: 'Z555'
					}
				} );

				expect( store.fragments[ fragmentKey ] ).toEqual( {
					hasError: true,
					isLoading: false,
					isPending: false,
					retryCount: 0,
					error: {
						code: 'error-code',
						zid: 'Z555'
					},
					html: ''
				} );
			} );

			it( 'sets new fragment', () => {
				const unseenKey = `better#:${ mockLang }`;

				store.setRenderedFragment( unseenKey, {
					html: 'some unseen fragment'
				} );

				expect( store.fragments[ unseenKey ] ).toEqual( {
					hasError: false,
					isLoading: false,
					isPending: false,
					retryCount: 0,
					error: null,
					html: 'some unseen fragment'
				} );
			} );

			it( 'sets new language for an existing fragment', () => {
				const unseenKey = 'suchgood#:Z1003';

				store.setRenderedFragment( unseenKey, {
					html: 'same fragment in new language'
				} );

				expect( store.fragments[ unseenKey ] ).toEqual( {
					hasError: false,
					isLoading: false,
					isPending: false,
					retryCount: 0,
					error: null,
					html: 'same fragment in new language'
				} );
			} );
		} );

		describe( 'insertHashAtKeyPath', () => {
			beforeEach( () => {
				store.sectionHashes = {};
			} );

			it( 'initializes the section and inserts hash if section did not exist', () => {
				store.insertHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.1', 'hash1' );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'hash1' ] );
			} );

			it( 'inserts hash at the beginning of the list', () => {
				store.sectionHashes = { Q101: [ 'hash1', 'hash2' ] };
				store.insertHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.1', 'newhash' );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'newhash', 'hash1', 'hash2' ] );
			} );

			it( 'inserts hash in the middle of the list', () => {
				store.sectionHashes = { Q101: [ 'hash1', 'hash2', 'hash3' ] };
				store.insertHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.2', 'newhash' );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'hash1', 'newhash', 'hash2', 'hash3' ] );
			} );

			it( 'inserts null hash if no hash is given', () => {
				store.sectionHashes = { Q101: [ 'hash1', 'hash2' ] };
				store.insertHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.1' );
				expect( store.sectionHashes.Q101 ).toEqual( [ null, 'hash1', 'hash2' ] );
			} );

			it( 'does not affect other sections', () => {
				store.sectionHashes = { Q101: [ 'hash1' ], Q102: [ 'goodhash' ] };
				store.insertHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.1', 'newhash' );
				expect( store.sectionHashes.Q102 ).toEqual( [ 'goodhash' ] );
			} );
		} );

		describe( 'deleteHashAtKeyPath', () => {
			beforeEach( () => {
				store.sectionHashes = {};
			} );

			it( 'does nothing if section does not exist', () => {
				store.deleteHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.1' );
				expect( store.sectionHashes.Q101 ).toBeUndefined();
			} );

			it( 'removes hash at the beginning of the list', () => {
				store.sectionHashes = { Q101: [ 'hash1', 'hash2', 'hash3' ] };
				store.deleteHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.1' );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'hash2', 'hash3' ] );
			} );

			it( 'removes hash in the middle of the list', () => {
				store.sectionHashes = { Q101: [ 'hash1', 'hash2', 'hash3' ] };
				store.deleteHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.2' );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'hash1', 'hash3' ] );
			} );

			it( 'removes hash at the end of the list', () => {
				store.sectionHashes = { Q101: [ 'hash1', 'hash2', 'hash3' ] };
				store.deleteHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.3' );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'hash1', 'hash2' ] );
			} );

			it( 'does not affect other sections', () => {
				store.sectionHashes = { Q101: [ 'hash1', 'hash2' ], Q102: [ 'goodhash' ] };
				store.deleteHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.1' );
				expect( store.sectionHashes.Q102 ).toEqual( [ 'goodhash' ] );
			} );
		} );

		describe( 'swapHashAtKeyPath', () => {
			beforeEach( () => {
				store.sectionHashes = {};
			} );

			it( 'does nothing if section does not exist', () => {
				store.swapHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.1', 1 );
				expect( store.sectionHashes.Q101 ).toBeUndefined();
			} );

			it( 'does nothing if swap index is out of bounds (forward)', () => {
				store.sectionHashes = { Q101: [ 'hash1', 'hash2' ] };
				store.swapHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.2', 1 );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'hash1', 'hash2' ] );
			} );

			it( 'does nothing if swap index is out of bounds (backward)', () => {
				store.sectionHashes = { Q101: [ 'hash1', 'hash2' ] };
				store.swapHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.1', -1 );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'hash1', 'hash2' ] );
			} );

			it( 'swaps hash one position forward', () => {
				store.sectionHashes = { Q101: [ 'hash1', 'hash2', 'hash3' ] };
				store.swapHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.1', 1 );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'hash2', 'hash1', 'hash3' ] );
			} );

			it( 'swaps hash one position backward', () => {
				store.sectionHashes = { Q101: [ 'hash1', 'hash2', 'hash3' ] };
				store.swapHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.2', -1 );
				expect( store.sectionHashes.Q101 ).toEqual( [ 'hash2', 'hash1', 'hash3' ] );
			} );

			it( 'does not affect other sections', () => {
				store.sectionHashes = { Q101: [ 'hash1', 'hash2' ], Q102: [ 'goodhash' ] };
				store.swapHashAtKeyPath( 'abstractwiki.sections.Q101.fragments.1', 1 );
				expect( store.sectionHashes.Q102 ).toEqual( [ 'goodhash' ] );
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
