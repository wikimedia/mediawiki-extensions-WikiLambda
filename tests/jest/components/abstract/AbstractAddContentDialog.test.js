/*!
 * WikiLambda unit test suite for the AbstractAddContentDialog component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { flushPromises, shallowMount } = require( '@vue/test-utils' );
const { dialogGlobalStubs } = require( '../../helpers/dialogTestHelpers.js' );
const { createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const LabelData = require( '../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractAddContentDialog = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractAddContentDialog.vue' );

describe( 'AbstractAddContentDialog', () => {
	let store;

	function renderDialog( props = {} ) {
		return shallowMount( AbstractAddContentDialog, {
			props: {
				open: true,
				...props
			},
			global: {
				// Render the shared item list and the header, so that their content is rendered
				stubs: {
					...dialogGlobalStubs,
					'wl-dialog-item-list': false,
					'wl-custom-dialog-header': false
				}
			}
		} );
	}

	function findOptions( wrapper ) {
		return wrapper.findAll( '.ext-wikilambda-app-dialog-item-list__button' );
	}

	function findOptionTitles( wrapper ) {
		return wrapper.findAll( '.ext-wikilambda-app-dialog-item-list__item-title' )
			.map( ( title ) => title.text() );
	}

	async function search( wrapper, term ) {
		wrapper.findComponent( { name: 'CdxSearchInput' } ).vm.$emit( 'update:modelValue', term );
		await flushPromises();
	}

	const searchResponse = {
		labels: [
			{ page_title: 'Z20001', label: 'paragraph from sentences', match_lang: 'Z1002' },
			{ page_title: 'Z20002', label: 'paragraph with a citation', match_lang: 'Z1002' }
		],
		searchContinue: null
	};

	beforeEach( () => {
		store = useMainStore();
		store.getSuggestedHtmlFunctions = [ 'Z10001', 'Z10002' ];
		store.getLabelData = createLabelDataMock( {
			Z10001: 'section title',
			Z10001K1: 'Wikidata item',
			Z10001K2: 'language',
			Z10002: 'paragraph'
		} );
		store.getDescription = jest.fn( ( zid ) => ( zid === 'Z10001' ?
			new LabelData( zid, 'Provides a section title from a QID.', 'Z1002', 'en' ) :
			undefined ) );
		store.getInputsOfFunctionZid = jest.fn( ( zid ) => ( zid === 'Z10001' ?
			[ { Z17K2: 'Z10001K1' }, { Z17K2: 'Z10001K2' } ] :
			[] ) );
		// No function is loaded yet
		store.getStoredObject = jest.fn( () => undefined );
		store.getUserLangZid = 'Z1002';
		store.getUserLangCode = 'en';
		store.getLanguageIsoCodeOfZLang = jest.fn( ( zid ) => ( { Z1002: 'en', Z1430: 'de' }[ zid ] ) );
		store.lookupZObjectLabels.mockResolvedValue( searchResponse );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderDialog();

		expect( wrapper.find( '.ext-wikilambda-app-abstract-add-content-dialog' ).exists() ).toBe( true );
	} );

	it( 'renders the title with no subtitle', () => {
		const wrapper = renderDialog();

		const dialog = wrapper.findComponent( { name: 'CdxDialog' } );
		expect( dialog.props( 'title' ) ).toBe( 'Add content' );
		expect( wrapper.find( '.cdx-dialog__header__title' ).text() ).toBe( 'Add content' );
		expect( wrapper.find( '.cdx-dialog__header__subtitle' ).exists() ).toBe( false );
	} );

	it( 'renders a search field in the header', () => {
		const wrapper = renderDialog();

		const searchInput = wrapper.findComponent( { name: 'CdxSearchInput' } );
		expect( searchInput.exists() ).toBe( true );
		expect( searchInput.attributes( 'placeholder' ) ).toBe( 'Search for a function' );
		expect( searchInput.attributes( 'aria-label' ) ).toBe( 'Search for a function' );
	} );

	it( 'renders the suggested functions in one group with a title', () => {
		const wrapper = renderDialog();

		const groups = wrapper.findAll( '.ext-wikilambda-app-dialog-item-list__group' );
		expect( groups.length ).toBe( 1 );
		expect( groups[ 0 ].find( 'h3' ).text() ).toBe( 'Community suggestions' );
		expect( findOptionTitles( wrapper ) ).toEqual( [ 'section title', 'paragraph' ] );
	} );

	it( 'renders the description and the inputs of a suggested function', () => {
		const wrapper = renderDialog();

		const option = findOptions( wrapper )[ 0 ];
		expect( option.find( '.ext-wikilambda-app-dialog-item-list__item-description' ).text() )
			.toBe( 'Provides a section title from a QID.' );
		const inputs = option.find( '.ext-wikilambda-app-abstract-add-content-dialog__option-inputs' );
		expect( inputs.text() ).toContain( 'Inputs:' );
		const chips = inputs.findAll( '.ext-wikilambda-app-abstract-add-content-dialog__option-input' );
		expect( chips.map( ( chip ) => chip.text() ) ).toEqual( [ 'Wikidata item', 'language' ] );
		// One hidden separator between the two input labels
		expect( inputs.findAll( '.ext-wikilambda-app-abstract-add-content-dialog__screen-reader-text' ).length ).toBe( 1 );
	} );

	it( 'shows no description or inputs when a function has none', () => {
		const wrapper = renderDialog();

		const option = findOptions( wrapper )[ 1 ];
		expect( option.find( '.ext-wikilambda-app-dialog-item-list__item-description' ).exists() ).toBe( false );
		expect( option.find( '.ext-wikilambda-app-abstract-add-content-dialog__option-inputs' ).exists() ).toBe( false );
	} );

	it( 'renders no options when there are no suggested functions', () => {
		store.getSuggestedHtmlFunctions = [];
		const wrapper = renderDialog();

		expect( wrapper.findAll( '.ext-wikilambda-app-dialog-item-list__group' ).length ).toBe( 0 );
		expect( findOptions( wrapper ).length ).toBe( 0 );
	} );

	it( 'emits select with the function zid when clicking a suggested function', async () => {
		const wrapper = renderDialog();

		await findOptions( wrapper )[ 1 ].trigger( 'click' );

		expect( wrapper.emitted( 'select' ) ).toEqual( [ [ 'Z10002' ] ] );
	} );

	it( 'emits close-dialog when the dialog is closed', () => {
		const wrapper = renderDialog();

		wrapper.findComponent( { name: 'CdxDialog' } ).vm.$emit( 'update:open', false );

		expect( wrapper.emitted( 'close-dialog' ) ).toBeTruthy();
	} );

	describe( 'function search', () => {
		it( 'searches the functions that return HTML', async () => {
			const wrapper = renderDialog();

			await search( wrapper, 'paragraph' );

			expect( store.lookupZObjectLabels ).toHaveBeenCalledWith( expect.objectContaining( {
				input: 'paragraph',
				types: [ Constants.Z_FUNCTION ],
				returnTypes: [ Constants.Z_HTML_FRAGMENT ]
			} ) );
		} );

		it( 'searches by zid when a link to a function is pasted', async () => {
			const wrapper = renderDialog();

			await search( wrapper, 'https://www.wikifunctions.org/view/en/Z20001' );

			expect( store.lookupZObjectLabels ).toHaveBeenCalledWith( expect.objectContaining( {
				input: 'Z20001'
			} ) );
		} );

		it( 'shows only the search results, with the labels from the search, and loads their data', async () => {
			const wrapper = renderDialog();

			await search( wrapper, 'paragraph' );

			expect( findOptionTitles( wrapper ) ).toEqual( [ 'paragraph from sentences', 'paragraph with a citation' ] );
			expect( wrapper.find( 'h3' ).exists() ).toBe( false );
			expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z20001', 'Z20002' ] } );
		} );

		function findName( option ) {
			return option.find( '.ext-wikilambda-app-dialog-item-list__item-title > span' );
		}

		function findMatch( option ) {
			return option.find( '.ext-wikilambda-app-abstract-add-content-dialog__match' );
		}

		it( 'shows the name in the user language, and the matched alias after it in its own language', async () => {
			store.lookupZObjectLabels.mockResolvedValue( {
				labels: [ { page_title: 'Z20001', label: 'paragraph', match_label: 'Absatz', match_lang: 'Z1430' } ],
				searchContinue: null
			} );
			const wrapper = renderDialog();

			await search( wrapper, 'Absatz' );

			const option = findOptions( wrapper )[ 0 ];
			expect( findName( option ).text() ).toBe( 'paragraph' );
			expect( findName( option ).attributes( 'lang' ) ).toBe( 'en' );
			expect( findMatch( option ).text() ).toBe( '(Absatz)' );
			expect( findMatch( option ).attributes( 'lang' ) ).toBe( 'de' );
		} );

		it( 'shows no matched text when the search matched the name itself', async () => {
			store.lookupZObjectLabels.mockResolvedValue( {
				labels: [ { page_title: 'Z20001', label: 'paragraph', match_label: 'paragraph', match_lang: 'Z1002' } ],
				searchContinue: null
			} );
			const wrapper = renderDialog();

			await search( wrapper, 'paragraph' );

			expect( findMatch( findOptions( wrapper )[ 0 ] ).exists() ).toBe( false );
		} );

		it( 'shows the zid after the name, without a language, when the search matched the zid', async () => {
			store.lookupZObjectLabels.mockResolvedValue( {
				labels: [ { page_title: 'Z20001', label: 'paragraph', match_label: 'Z20001', match_lang: 'Z1002' } ],
				searchContinue: null
			} );
			const wrapper = renderDialog();

			await search( wrapper, 'Z20001' );

			const match = findMatch( findOptions( wrapper )[ 0 ] );
			expect( match.text() ).toBe( '(Z20001)' );
			expect( match.attributes( 'lang' ) ).toBeUndefined();
		} );

		it( 'keeps the matched text after the function is loaded', async () => {
			store.getStoredObject = jest.fn( () => ( {} ) );
			store.getLabelData = createLabelDataMock( { Z20001: 'paragraph' } );
			store.lookupZObjectLabels.mockResolvedValue( {
				labels: [ { page_title: 'Z20001', label: 'paragraph', match_label: 'Absatz', match_lang: 'Z1430' } ],
				searchContinue: null
			} );
			const wrapper = renderDialog();

			await search( wrapper, 'Absatz' );

			expect( findMatch( findOptions( wrapper )[ 0 ] ).text() ).toBe( '(Absatz)' );
		} );

		it( 'shows no matched text for the suggested functions', () => {
			const wrapper = renderDialog();

			expect( wrapper.find( '.ext-wikilambda-app-abstract-add-content-dialog__match' ).exists() ).toBe( false );
		} );

		it( 'shows the label, description and inputs of a result once its function is loaded', async () => {
			store.getStoredObject = jest.fn( ( zid ) => ( zid === 'Z20001' ? {} : undefined ) );
			store.getLabelData = createLabelDataMock( { Z20001: 'paragraph', Z20001K1: 'sentences' } );
			store.getDescription = jest.fn( ( zid ) => ( zid === 'Z20001' ?
				new LabelData( zid, 'Joins sentences into a paragraph.', 'Z1002', 'en' ) :
				undefined ) );
			store.getInputsOfFunctionZid = jest.fn( ( zid ) => ( zid === 'Z20001' ? [ { Z17K2: 'Z20001K1' } ] : [] ) );
			const wrapper = renderDialog();

			await search( wrapper, 'paragraph' );

			const option = findOptions( wrapper )[ 0 ];
			expect( option.find( '.ext-wikilambda-app-dialog-item-list__item-title' ).text() ).toBe( 'paragraph' );
			expect( option.find( '.ext-wikilambda-app-dialog-item-list__item-description' ).text() )
				.toBe( 'Joins sentences into a paragraph.' );
			expect( option.find( '.ext-wikilambda-app-abstract-add-content-dialog__option-input' ).text() )
				.toBe( 'sentences' );
		} );

		it( 'emits select with the zid of a search result', async () => {
			const wrapper = renderDialog();

			await search( wrapper, 'paragraph' );
			await findOptions( wrapper )[ 1 ].trigger( 'click' );

			expect( wrapper.emitted( 'select' ) ).toEqual( [ [ 'Z20002' ] ] );
		} );

		it( 'keeps the suggested functions until the first results arrive', async () => {
			store.lookupZObjectLabels.mockReturnValue( new Promise( () => {} ) );
			const wrapper = renderDialog();

			await search( wrapper, 'paragraph' );

			expect( findOptionTitles( wrapper ) ).toEqual( [ 'section title', 'paragraph' ] );
		} );

		it( 'keeps the previous results until the results of the new search term arrive', async () => {
			let resolveSecond;
			store.lookupZObjectLabels
				.mockResolvedValueOnce( searchResponse )
				.mockReturnValueOnce( new Promise( ( resolve ) => {
					resolveSecond = resolve;
				} ) );
			const wrapper = renderDialog();

			await search( wrapper, 'paragraph' );
			await search( wrapper, 'paragraph with' );

			expect( findOptionTitles( wrapper ) ).toEqual( [ 'paragraph from sentences', 'paragraph with a citation' ] );

			resolveSecond( { labels: [ searchResponse.labels[ 1 ] ], searchContinue: null } );
			await flushPromises();

			expect( findOptionTitles( wrapper ) ).toEqual( [ 'paragraph with a citation' ] );
		} );

		function findNextSteps( wrapper ) {
			return wrapper.findComponent( { name: 'wl-function-search-next-steps' } );
		}

		it( 'shows the next steps for functions that return HTML, and no options, when the search finds nothing', async () => {
			store.lookupZObjectLabels.mockResolvedValue( { labels: [], searchContinue: null } );
			const wrapper = renderDialog();

			await search( wrapper, 'nothing' );

			expect( findNextSteps( wrapper ).exists() ).toBe( true );
			expect( findNextSteps( wrapper ).props( 'returnType' ) ).toBe( Constants.Z_HTML_FRAGMENT );
			expect( findOptions( wrapper ).length ).toBe( 0 );
			expect( store.fetchZids ).not.toHaveBeenCalled();
		} );

		it( 'shows no next steps before a search', () => {
			const wrapper = renderDialog();

			expect( findNextSteps( wrapper ).exists() ).toBe( false );
		} );

		it( 'replaces the previous results with the next steps when a new search finds nothing', async () => {
			store.lookupZObjectLabels
				.mockResolvedValueOnce( searchResponse )
				.mockResolvedValueOnce( { labels: [], searchContinue: null } );
			const wrapper = renderDialog();

			await search( wrapper, 'paragraph' );
			await search( wrapper, 'paragraphs about nothing' );

			expect( findNextSteps( wrapper ).exists() ).toBe( true );
			expect( findOptions( wrapper ).length ).toBe( 0 );
		} );

		it( 'keeps the next steps until the results of the new search term arrive', async () => {
			let resolveSecond;
			store.lookupZObjectLabels
				.mockResolvedValueOnce( { labels: [], searchContinue: null } )
				.mockReturnValueOnce( new Promise( ( resolve ) => {
					resolveSecond = resolve;
				} ) );
			const wrapper = renderDialog();

			await search( wrapper, 'nothing' );
			await search( wrapper, 'paragraph' );

			expect( findNextSteps( wrapper ).exists() ).toBe( true );

			resolveSecond( searchResponse );
			await flushPromises();

			expect( findNextSteps( wrapper ).exists() ).toBe( false );
			expect( findOptionTitles( wrapper ) ).toEqual( [ 'paragraph from sentences', 'paragraph with a citation' ] );
		} );

		it( 'shows the suggested functions, and no next steps, when the search fails', async () => {
			store.lookupZObjectLabels
				.mockResolvedValueOnce( { labels: [], searchContinue: null } )
				.mockRejectedValueOnce( { code: 'http' } );
			const wrapper = renderDialog();

			await search( wrapper, 'nothing' );
			await search( wrapper, 'paragraph with' );

			expect( findNextSteps( wrapper ).exists() ).toBe( false );
			expect( findOptionTitles( wrapper ) ).toEqual( [ 'section title', 'paragraph' ] );
		} );

		it( 'keeps the current options when a search is cancelled by a newer one', async () => {
			store.lookupZObjectLabels
				.mockResolvedValueOnce( searchResponse )
				.mockRejectedValueOnce( { code: 'abort' } );
			const wrapper = renderDialog();

			await search( wrapper, 'paragraph' );
			await search( wrapper, 'paragraph with' );

			expect( findOptionTitles( wrapper ) ).toEqual( [ 'paragraph from sentences', 'paragraph with a citation' ] );
		} );

		it( 'ignores the results of a search term that changed since', async () => {
			let resolveFirst;
			store.lookupZObjectLabels
				.mockReturnValueOnce( new Promise( ( resolve ) => {
					resolveFirst = resolve;
				} ) )
				.mockResolvedValueOnce( { labels: [ searchResponse.labels[ 1 ] ], searchContinue: null } );
			const wrapper = renderDialog();

			await search( wrapper, 'para' );
			await search( wrapper, 'paragraph with' );
			resolveFirst( searchResponse );
			await flushPromises();

			expect( findOptionTitles( wrapper ) ).toEqual( [ 'paragraph with a citation' ] );
		} );

		it( 'shows the suggested functions again when the search is cleared', async () => {
			const wrapper = renderDialog();

			await search( wrapper, 'paragraph' );
			await search( wrapper, '' );

			expect( findOptionTitles( wrapper ) ).toEqual( [ 'section title', 'paragraph' ] );
		} );

		it( 'shows the suggested functions instead of the next steps when the search is cleared', async () => {
			store.lookupZObjectLabels.mockResolvedValue( { labels: [], searchContinue: null } );
			const wrapper = renderDialog();

			await search( wrapper, 'nothing' );
			await search( wrapper, '' );

			expect( findNextSteps( wrapper ).exists() ).toBe( false );
			expect( findOptionTitles( wrapper ) ).toEqual( [ 'section title', 'paragraph' ] );
		} );

		it( 'clears the search when the dialog closes', async () => {
			const wrapper = renderDialog();

			await search( wrapper, 'paragraph' );
			await wrapper.setProps( { open: false } );
			await wrapper.setProps( { open: true } );

			expect( wrapper.findComponent( { name: 'CdxSearchInput' } ).props( 'modelValue' ) ).toBe( '' );
			expect( findOptionTitles( wrapper ) ).toEqual( [ 'section title', 'paragraph' ] );
		} );
	} );
} );
