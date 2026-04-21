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
		store.qid = undefined;
		store.fragments = {};
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

			it( 'returns the stored fragment preview for a given language', () => {
				const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';
				const fragmentPreview = {
					hasError: false,
					isDirty: false,
					isLoading: false,
					error: null,
					html: '<b>Preview</b>'
				};
				store.fragments = {
					[ keyPath ]: {
						[ mockLang ]: fragmentPreview
					}
				};
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
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';
			const payload = {
				keyPath,
				qid: mockQid,
				language: mockLang,
				date: mockDate,
				isAsync: false,
				fragment: fragmentsOf( mockAbstractContentHybrid )[ 1 ]
			};

			beforeEach( () => {
				store.fragments = {
					[ keyPath ]: {
						[ mockLang ]: {
							hasError: false,
							isDirty: true,
							isLoading: false,
							error: null,
							html: 'old fragment'
						}
					}
				};

				store.requestFragmentPreview = jest.fn();
				store.enqueueFragmentPreview = jest.fn();
			} );

			it( 'does not render again if fragment is not dirty', async () => {
				store.fragments[ keyPath ][ mockLang ].isDirty = false;

				await store.renderFragmentPreview( payload );

				expect( store.enqueueFragmentPreview ).not.toHaveBeenCalled();
			} );

			it( 'does not render again if fragment is loading', async () => {
				store.fragments[ keyPath ][ mockLang ].isLoading = true;

				await store.renderFragmentPreview( payload );

				expect( store.enqueueFragmentPreview ).not.toHaveBeenCalled();
			} );

			it( 'sets loading state when ongoing render call', () => {
				store.renderFragmentPreview( payload );

				expect( store.enqueueFragmentPreview ).toHaveBeenCalled();
				expect( store.fragments[ keyPath ][ mockLang ].isLoading ).toBe( true );
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

			const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';
			const payload = {
				keyPath,
				qid: mockQid,
				language: mockLang,
				date: mockDate,
				isAsync: true,
				fragment: fragmentsOf( mockAbstractContentHybrid )[ 1 ]
			};

			beforeEach( () => {
				store.fragments = {
					[ keyPath ]: {
						[ mockLang ]: {
							hasError: false,
							isDirty: true,
							isLoading: false,
							retryCount: 0,
							error: null,
							html: 'old fragment'
						}
					}
				};

				retryJob = jest.fn();
				store.setRenderedFragment = jest.fn();
				store.enqueueFragmentPreview = jest.fn();

				jest.useFakeTimers();

				// Mock Api GET abstractwiki_run_fragment
				getMock = jest.fn().mockResolvedValue( {
					abstractwiki_run_fragment: { success: true, value: 'rendered fragment' }
				} );
				mw.Api = jest.fn( () => ( {
					get: getMock
				} ) );
			} );

			afterEach( () => {
				jest.useRealTimers();
			} );

			it( 'runs sync call', async () => {
				const syncPayload = {
					keyPath,
					qid: mockQid,
					language: mockLang,
					date: mockDate,
					isAsync: false,
					fragment: fragmentsOf( mockAbstractContentHybrid )[ 1 ]
				};

				await store.requestFragmentPreview( syncPayload, retryJob );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'abstractwiki_run_fragment',
					format: 'json',
					formatversion: '2',
					abstractwiki_run_fragment_qid: mockQid,
					abstractwiki_run_fragment_language: mockLang,
					abstractwiki_run_fragment_date: mockDate,
					abstractwiki_run_fragment_async: false,
					abstractwiki_run_fragment_fragment: JSON.stringify( fragmentsOf( mockAbstractContent )[ 1 ] )
				}, { signal: undefined } );
			} );

			it( 'runs render fragment and stores successful response', async () => {
				await store.requestFragmentPreview( payload, retryJob );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'abstractwiki_run_fragment',
					format: 'json',
					formatversion: '2',
					abstractwiki_run_fragment_qid: mockQid,
					abstractwiki_run_fragment_language: mockLang,
					abstractwiki_run_fragment_date: mockDate,
					abstractwiki_run_fragment_async: true,
					abstractwiki_run_fragment_fragment: JSON.stringify( fragmentsOf( mockAbstractContent )[ 1 ] )
				}, { signal: undefined } );

				const expectedFragment = { keyPath, language: mockLang, fragment: 'rendered fragment' };
				expect( store.setRenderedFragment ).toHaveBeenCalledWith( expectedFragment );
			} );

			it( 'runs render fragment and retries if fragment pending', async () => {
				getMock = jest.fn().mockResolvedValue( {
					abstractwiki_run_fragment: { success: true, pending: true }
				} );

				expect( store.fragments[ keyPath ][ mockLang ].retryCount ).toBe( 0 );

				await store.requestFragmentPreview( payload, retryJob );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'abstractwiki_run_fragment',
					format: 'json',
					formatversion: '2',
					abstractwiki_run_fragment_qid: mockQid,
					abstractwiki_run_fragment_language: mockLang,
					abstractwiki_run_fragment_date: mockDate,
					abstractwiki_run_fragment_async: true,
					abstractwiki_run_fragment_fragment: JSON.stringify( fragmentsOf( mockAbstractContent )[ 1 ] )
				}, { signal: undefined } );

				// Assert that the retryCount has increased
				expect( store.fragments[ keyPath ][ mockLang ].retryCount ).toBe( 1 );

				// Assert that a job has been enqueued after the first-retry backoff
				// delay (INITIAL_RETRY_DELAY = 2000ms for retryCount === 1).
				jest.advanceTimersByTime( 2100 );
				expect( store.enqueueFragmentPreview ).toHaveBeenCalledTimes( 1 );

				// Assert that the job enqueued is the one passed as input
				expect( retryJob ).not.toHaveBeenCalled();
				store.enqueueFragmentPreview.mock.calls[ 0 ][ 0 ]();
				expect( retryJob ).toHaveBeenCalled();
			} );

			it( 'runs render fragment and stops if fragment pending but reached max retries', async () => {
				// MAX_FRAGMENT_RETRIES = 3, so seed retryCount at MAX - 1 so that
				// the next pending response trips the max-retries branch.
				store.fragments[ keyPath ][ mockLang ].retryCount = 2;

				getMock = jest.fn().mockResolvedValue( {
					abstractwiki_run_fragment: { success: true, pending: true }
				} );

				expect( store.fragments[ keyPath ][ mockLang ].retryCount ).toBe( 2 );

				await store.requestFragmentPreview( payload, retryJob );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'abstractwiki_run_fragment',
					format: 'json',
					formatversion: '2',
					abstractwiki_run_fragment_qid: mockQid,
					abstractwiki_run_fragment_language: mockLang,
					abstractwiki_run_fragment_date: mockDate,
					abstractwiki_run_fragment_async: true,
					abstractwiki_run_fragment_fragment: JSON.stringify( fragmentsOf( mockAbstractContent )[ 1 ] )
				}, { signal: undefined } );

				// Assert that the retryCount has increased to MAX_FRAGMENT_RETRIES
				expect( store.fragments[ keyPath ][ mockLang ].retryCount ).toBe( 3 );

				// Assert that final preview has been set
				expect( store.setRenderedFragment ).toHaveBeenCalledWith( {
					keyPath,
					language: mockLang,
					error: {
						type: 'warning',
						retry: true,
						text: 'Reached max retries. Try again later.'
					}
				} );

				// Assert that a job has not been enqueued
				jest.advanceTimersByTime( 300 );
				expect( store.enqueueFragmentPreview ).not.toHaveBeenCalled();
			} );

			it( 'runs render fragment and stores failed unknown response', async () => {
				getMock = jest.fn().mockRejectedValue( new Error( 'API error' ) );

				const mockErrMsg = 'some unknown error message';
				mw.message = jest.fn().mockReturnValue( { text: jest.fn().mockReturnValue( mockErrMsg ) } );

				await store.requestFragmentPreview( payload, retryJob );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'abstractwiki_run_fragment',
					format: 'json',
					formatversion: '2',
					abstractwiki_run_fragment_qid: mockQid,
					abstractwiki_run_fragment_language: mockLang,
					abstractwiki_run_fragment_date: mockDate,
					abstractwiki_run_fragment_async: true,
					abstractwiki_run_fragment_fragment: JSON.stringify( fragmentsOf( mockAbstractContent )[ 1 ] )
				}, { signal: undefined } );

				expect( store.setRenderedFragment ).toHaveBeenCalledWith( {
					keyPath,
					language: mockLang,
					error: {
						retry: false,
						text: mockErrMsg
					}
				} );
			} );

			it( 'runs render fragment and stores failed zerror response', async () => {
				store.fetchZids = jest.fn();

				const error = {
					code: 'wikilambda-zerror',
					msg: 'apierror-abstractwiki_run_fragment-returned-zerror',
					zerror: { Z1K1: 'Z5', Z5K1: 'Z555' },
					zerrorType: 'Z555'
				};

				// NOTE: use real timers for this job, we need it for the get mock
				jest.useRealTimers();
				getMock = jest.fn().mockImplementation( () => ( {
					then: () => ( {
						catch: ( handler ) => setTimeout( () => handler( 'code', { error } ), 0 )
					} )
				} ) );

				await store.requestFragmentPreview( payload, retryJob );

				expect( getMock ).toHaveBeenCalledWith( {
					action: 'abstractwiki_run_fragment',
					format: 'json',
					formatversion: '2',
					abstractwiki_run_fragment_qid: mockQid,
					abstractwiki_run_fragment_language: mockLang,
					abstractwiki_run_fragment_date: mockDate,
					abstractwiki_run_fragment_async: true,
					abstractwiki_run_fragment_fragment: JSON.stringify( fragmentsOf( mockAbstractContent )[ 1 ] )
				}, { signal: undefined } );

				expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z555' ] } );

				expect( store.setRenderedFragment ).toHaveBeenCalledWith( {
					keyPath,
					language: mockLang,
					error: {
						code: 'apierror-abstractwiki_run_fragment-returned-zerror',
						retry: false,
						zid: 'Z555'
					}
				} );
			} );
		} );

		describe( 'setRenderedFragment', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';

			beforeEach( () => {
				store.fragments = {
					[ keyPath ]: {
						[ mockLang ]: {
							html: 'old fragment'
						}
					}
				};
			} );

			it( 'sets successful rendered fragment', () => {
				store.setRenderedFragment( {
					keyPath,
					language: mockLang,
					fragment: 'some rendered fragment'
				} );

				expect( store.fragments[ keyPath ][ mockLang ] ).toEqual( {
					hasError: false,
					isDirty: false,
					isLoading: false,
					retryCount: 0,
					error: null,
					html: 'some rendered fragment'
				} );
			} );

			it( 'sets failed rendered fragment with error text', () => {
				store.setRenderedFragment( {
					keyPath,
					language: mockLang,
					error: {
						text: 'Some error message'
					}
				} );

				expect( store.fragments[ keyPath ][ mockLang ] ).toEqual( {
					hasError: true,
					isDirty: false,
					isLoading: false,
					retryCount: 0,
					error: {
						text: 'Some error message'
					},
					html: ''
				} );
			} );

			it( 'sets failed rendered fragment with zerror', () => {
				store.setRenderedFragment( {
					keyPath,
					language: mockLang,
					error: {
						code: 'error-code',
						zid: 'Z555'
					}
				} );

				expect( store.fragments[ keyPath ][ mockLang ] ).toEqual( {
					hasError: true,
					isDirty: false,
					isLoading: false,
					retryCount: 0,
					error: {
						code: 'error-code',
						zid: 'Z555'
					},
					html: ''
				} );
			} );

			it( 'sets new fragment', () => {
				const newKeyPath = 'abstractwiki.sections.Q8776414.fragments.1';

				store.setRenderedFragment( {
					keyPath: newKeyPath,
					language: mockLang,
					fragment: 'some new fragment'
				} );

				expect( store.fragments[ keyPath ][ mockLang ] ).toEqual( {
					hasError: false,
					isDirty: false,
					isLoading: false,
					retryCount: 0,
					error: null,
					html: 'some new fragment'
				} );
			} );

			it( 'sets new language for an existing fragment', () => {
				const newLanguage = 'Z1111';

				store.setRenderedFragment( {
					keyPath,
					language: newLanguage,
					fragment: 'some new fragment in new language'
				} );

				expect( store.fragments[ keyPath ][ newLanguage ] ).toEqual( {
					hasError: false,
					isDirty: false,
					isLoading: false,
					retryCount: 0,
					error: null,
					html: 'some new fragment in new language'
				} );
			} );
		} );

		describe( 'setDirtyFragment', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';
			const childKeyPath = `${ keyPath }.Z444K1.3`;
			const debounceTime = 2000;
			const otherLang = 'Z1111';

			beforeEach( () => {
				jest.useFakeTimers();

				store.fragments = {
					[ keyPath ]: {
						[ mockLang ]: {
							hasError: false,
							isDirty: false,
							isLoading: false,
							error: null,
							html: 'old fragment'
						},
						[ otherLang ]: {
							hasError: true,
							isDirty: false,
							isLoading: false,
							error: null,
							html: 'old fragment in other lang'
						}
					}
				};
			} );

			afterEach( () => {
				jest.useRealTimers();
			} );

			it( 'sets fragment as dirty after debounce', () => {
				store.setDirtyFragment( childKeyPath );

				// Doesn't set dirty immediately but waits for debounce
				expect( store.fragments[ keyPath ][ mockLang ].isDirty ).toBe( false );
				expect( store.fragments[ keyPath ][ otherLang ].isDirty ).toBe( false );

				// Sets dirty after debounce timer goes off
				jest.advanceTimersByTime( debounceTime );
				expect( store.fragments[ keyPath ][ mockLang ].isDirty ).toBe( true );
				expect( store.fragments[ keyPath ][ otherLang ].isDirty ).toBe( true );
			} );

			it( 'sets fragment as dirty immediately if requested', () => {
				store.setDirtyFragment( childKeyPath, true );

				expect( store.fragments[ keyPath ][ mockLang ].isDirty ).toBe( false );
				expect( store.fragments[ keyPath ][ otherLang ].isDirty ).toBe( false );

				// Sets dirty after 0ms timer goes off
				jest.advanceTimersByTime( 1 );
				expect( store.fragments[ keyPath ][ mockLang ].isDirty ).toBe( true );
				expect( store.fragments[ keyPath ][ otherLang ].isDirty ).toBe( true );
			} );

			it( 'does nothing if fragment is not initialized', () => {
				store.fragments = {};

				store.setDirtyFragment( childKeyPath );
				jest.runAllTimers();

				expect( store.fragments[ keyPath ] ).toBeUndefined();
			} );

			it( 'debounces multiple calls', () => {
				store.fragments = {
					[ keyPath ]: {
						[ mockLang ]: {
							hasError: false,
							isDirty: false,
							isLoading: false,
							error: null,
							html: 'old fragment'
						}
					}
				};
				store.setDirtyFragment( childKeyPath );
				store.setDirtyFragment( childKeyPath );
				store.setDirtyFragment( childKeyPath );

				jest.advanceTimersByTime( debounceTime );

				expect( store.fragments[ keyPath ][ mockLang ].isDirty ).toBe( true );
			} );
		} );

		describe( 'swapFragmentPreviews', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments';
			const en = 'Z1002';
			const es = 'Z1003';

			beforeEach( () => {
				store.fragments = {
					[ `${ keyPath }.1` ]: {
						[ en ]: { isDirty: false, isLoading: false, hasError: false, html: 'EN fragment 1' },
						[ es ]: { isDirty: false, isLoading: false, hasError: false, html: 'ES fragment 1' }
					},
					[ `${ keyPath }.2` ]: {
						[ en ]: { isDirty: false, isLoading: false, hasError: false, html: 'EN fragment 2' },
						[ es ]: { isDirty: false, isLoading: false, hasError: false, html: 'ES fragment 2' }
					},
					[ `${ keyPath }.3` ]: {
						[ en ]: { isDirty: false, isLoading: false, hasError: false, html: 'EN fragment 3' },
						[ es ]: { isDirty: false, isLoading: false, hasError: false, html: 'ES fragment 3' }
					}
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

				expect( store.fragments[ `${ keyPath }.1` ][ en ].html ).toBe( 'EN fragment 2' );
				expect( store.fragments[ `${ keyPath }.1` ][ es ].html ).toBe( 'ES fragment 2' );

				expect( store.fragments[ `${ keyPath }.2` ][ en ].html ).toBe( 'EN fragment 1' );
				expect( store.fragments[ `${ keyPath }.2` ][ es ].html ).toBe( 'ES fragment 1' );
			} );
		} );

		describe( 'shiftFragmentPreviews', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments';
			const en = 'Z1002';
			const es = 'Z1003';

			beforeEach( () => {
				store.fragments = {
					[ `${ keyPath }.1` ]: {
						[ en ]: { isDirty: false, isLoading: false, hasError: false, html: 'EN fragment 1' },
						[ es ]: { isDirty: false, isLoading: false, hasError: false, html: 'ES fragment 1' }
					},
					[ `${ keyPath }.2` ]: {
						[ en ]: { isDirty: false, isLoading: false, hasError: false, html: 'EN fragment 2' },
						[ es ]: { isDirty: false, isLoading: false, hasError: false, html: 'ES fragment 2' }
					},
					[ `${ keyPath }.3` ]: {
						[ en ]: { isDirty: false, isLoading: false, hasError: false, html: 'EN fragment 3' },
						[ es ]: { isDirty: false, isLoading: false, hasError: false, html: 'ES fragment 3' }
					}
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

				// Left slot 2 empty
				expect( store.fragments[ `${ keyPath }.2` ] ).toBeUndefined();

				// Shiftead forward fragment 2 to 3
				expect( store.fragments[ `${ keyPath }.3` ][ en ].html ).toBe( 'EN fragment 2' );
				expect( store.fragments[ `${ keyPath }.3` ][ es ].html ).toBe( 'ES fragment 2' );

				// Shifted forward framgnet 3 to 4
				expect( store.fragments[ `${ keyPath }.4` ][ en ].html ).toBe( 'EN fragment 3' );
				expect( store.fragments[ `${ keyPath }.4` ][ es ].html ).toBe( 'ES fragment 3' );
			} );

			it( 'shifts two items one position back', () => {
				store.shiftFragmentPreviews( `${ keyPath }.2`, -1 );

				// Shifted back fragment 2 to 1
				expect( store.fragments[ `${ keyPath }.1` ][ en ].html ).toBe( 'EN fragment 2' );
				expect( store.fragments[ `${ keyPath }.1` ][ es ].html ).toBe( 'ES fragment 2' );

				// Shifted back fragment 3 to 2
				expect( store.fragments[ `${ keyPath }.2` ][ en ].html ).toBe( 'EN fragment 3' );
				expect( store.fragments[ `${ keyPath }.2` ][ es ].html ).toBe( 'ES fragment 3' );

				// Left slot 3 empty
				expect( store.fragments[ `${ keyPath }.3` ] ).toBeUndefined();
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
