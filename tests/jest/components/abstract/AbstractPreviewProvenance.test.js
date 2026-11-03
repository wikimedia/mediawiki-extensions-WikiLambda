/*!
 * WikiLambda unit test suite for the AbstractPreviewProvenance component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractPreviewProvenance = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractPreviewProvenance.vue' );

describe( 'AbstractPreviewProvenance', () => {
	let store;

	function renderProvenance( fragmentPreview, freshRequest = undefined ) {
		return shallowMount( AbstractPreviewProvenance, {
			props: {
				open: true,
				anchor: {},
				fragmentPreview,
				freshRequest
			},
			global: {
				stubs: {
					// Render the popover content in place
					'cdx-popover': {
						template: '<div class="cdx-popover-stub"><slot></slot></div>',
						props: [ 'open', 'anchor', 'title', 'icon', 'useCloseButton', 'placement' ],
						emits: [ 'update:open' ]
					},
					'wl-function-metadata-item': false,
					'cdx-button': false,
					'cdx-message': false
				}
			}
		} );
	}

	/**
	 * Returns the text of each row of the popover, as "Title: value"
	 *
	 * @param {Object} wrapper
	 * @return {string[]}
	 */
	function getRows( wrapper ) {
		return wrapper.findAll( '.ext-wikilambda-app-function-metadata-item' )
			.map( ( row ) => row.text().replace( /\s+/g, ' ' ) );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getItemUrl = ( id ) => `https://www.wikidata.org/wiki/${ id }`;
		store.getLexemeUrl = ( id ) => `https://www.wikidata.org/wiki/Lexeme:${ id }`;
		store.getPropertyUrl = ( id ) => `https://www.wikidata.org/wiki/Property:${ id }`;
		store.getLexemeFormUrl = () => null;
		store.getLexemeSenseUrl = () => null;
		// Fresh results are off by default, as on a wiki
		store.getWikilambdaConfig = {};
		store.userHasRight = jest.fn().mockReturnValue( false );
	} );

	it( 'is a popover titled "Provenance", with a close button and an arrow below the fragment', () => {
		const wrapper = renderProvenance( { metadata: null, renderDate: null } );

		const popover = wrapper.findComponent( '.cdx-popover-stub' );
		expect( popover.props( 'title' ) ).toBe( 'Provenance' );
		expect( popover.props( 'useCloseButton' ) ).toBe( true );
		expect( popover.props( 'placement' ) ).toBe( 'bottom' );
		expect( popover.props( 'icon' ) ).toBeTruthy();
	} );

	it( 'emits update:open when the popover asks to close', () => {
		const wrapper = renderProvenance( { metadata: null, renderDate: null } );

		wrapper.findComponent( '.cdx-popover-stub' ).vm.$emit( 'update:open', false );

		expect( wrapper.emitted( 'update:open' ) ).toEqual( [ [ false ] ] );
	} );

	it( 'says that the response was newly generated, for a fresh result', () => {
		const wrapper = renderProvenance( {
			metadata: { functionCallFreshResult: '2026-10-24T00:47:20Z' },
			renderDate: '20261024004720'
		} );

		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-provenance__summary' ).text() )
			.toBe( 'This response was newly generated' );
	} );

	it( 'says that a new response used cached Wikidata entities, when it did', () => {
		const wrapper = renderProvenance( {
			metadata: { cachedWikidataEntities: [ 'Z6', 'Q42' ] },
			renderDate: '20261024004720'
		} );

		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-provenance__summary' ).text() )
			.toBe( 'This response was newly generated, but used cached Wikidata entities' );
	} );

	it( 'says that a cached response was retrieved from the cache, even if it used cached Wikidata entities', () => {
		const wrapper = renderProvenance( {
			metadata: {
				functionCallCachedOn: '2026-10-24T00:47:20Z',
				cachedWikidataEntities: [ 'Z6', 'Q42' ]
			},
			renderDate: '20261024004720'
		} );

		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-provenance__summary' ).text() )
			.toBe( 'This response was retrieved from the cache' );
	} );

	it( 'says that the response was retrieved from the cache, for any other result', () => {
		const wrapper = renderProvenance( {
			metadata: { functionCallCachedOn: '2026-10-24T00:47:20Z' },
			renderDate: '20261024004720'
		} );

		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-provenance__summary' ).text() )
			.toBe( 'This response was retrieved from the cache' );
	} );

	it( 'says that the text was generated earlier and stored, when it came from the fragment store', () => {
		const wrapper = renderProvenance( {
			metadata: { functionCallFreshResult: '2026-10-24T00:47:20Z' },
			renderDate: '20261024004720',
			fromFragmentStore: true
		} );

		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-provenance__summary' ).text() )
			.toBe( 'This text was generated earlier and stored' );
		// The rows still say how Wikifunctions made the response
		expect( getRows( wrapper ) ).toEqual( [
			'Fragment rendered: 4 minutes ago',
			'Response generated with latest data: 4 minutes ago'
		] );
	} );

	it( 'says that a stored fragment without metadata was generated earlier and stored', () => {
		const wrapper = renderProvenance( {
			metadata: null,
			renderDate: '20261024004720',
			fromFragmentStore: true
		} );

		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-provenance__summary' ).text() )
			.toBe( 'This text was generated earlier and stored' );
		expect( getRows( wrapper ) ).toEqual( [ 'Fragment rendered: 4 minutes ago' ] );
	} );

	it( 'shows when the fragment was rendered, then the freshness metadata in order', () => {
		const wrapper = renderProvenance( {
			metadata: {
				cachedWikidataEntities: [ 'Z6', 'Q42', 'L1' ],
				functionCallCachedOn: '2026-10-24T00:47:20Z'
			},
			renderDate: '20261024004720'
		} );

		expect( getRows( wrapper ) ).toEqual( [
			'Fragment rendered: 4 minutes ago',
			'Cached function call: 4 minutes ago',
			'Cached Wikidata entities: Q42, L1'
		] );
	} );

	it( 'links the cached Wikidata entities', () => {
		const wrapper = renderProvenance( {
			metadata: { cachedWikidataEntities: [ 'Z6', 'Q42' ] },
			renderDate: null
		} );

		const link = wrapper.find( '.ext-wikilambda-app-function-metadata-item a' );
		expect( link.attributes( 'href' ) ).toBe( 'https://www.wikidata.org/wiki/Q42' );
		expect( link.text() ).toBe( 'Q42' );
	} );

	it( 'gives a note and the render time, for a fragment stored without metadata', () => {
		const wrapper = renderProvenance( { metadata: null, renderDate: '20261024004720' } );

		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-provenance__summary' ).text() )
			.toBe( 'No provenance information is available for this fragment' );
		expect( getRows( wrapper ) ).toEqual( [ 'Fragment rendered: 4 minutes ago' ] );
	} );

	it( 'gives the usual summary and rows for a failed render that Wikifunctions answered', () => {
		// e.g. a failure that an outdated cached Wikidata entity may have caused (T441583)
		const wrapper = renderProvenance( {
			hasError: true,
			metadata: {
				functionCallCachedOn: '2026-10-24T00:47:20Z',
				cachedWikidataEntities: [ 'Z6', 'Q42' ]
			},
			renderDate: '20261024004720'
		} );

		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-provenance__summary' ).text() )
			.toBe( 'This response was retrieved from the cache' );
		expect( getRows( wrapper ) ).toEqual( [
			'Fragment rendered: 4 minutes ago',
			'Cached function call: 4 minutes ago',
			'Cached Wikidata entities: Q42'
		] );
	} );

	it( 'gives only the note, for a fragment that has not been rendered', () => {
		const wrapper = renderProvenance( { isBlank: true } );

		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-provenance__summary' ).text() )
			.toBe( 'No provenance information is available for this fragment' );
		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-provenance__content' ).exists() ).toBe( false );
	} );

	it( 'links to the help page about result provenance', () => {
		const wrapper = renderProvenance( { metadata: null, renderDate: null } );

		const link = wrapper.find( '.ext-wikilambda-app-abstract-preview-provenance__link' );
		expect( link.text() ).toBe( 'About result provenance' );
		expect( link.attributes( 'href' ) ).toBe(
			'https://www.mediawiki.org/wiki/Help:Wikifunctions/Provenance_metadata_and_result_freshening'
		);
	} );

	describe( 'Run with latest data (T441584)', () => {
		const findButton = ( wrapper ) => wrapper.find( '.ext-wikilambda-app-abstract-preview-provenance__fresh' );

		/**
		 * Lets this user ask for fresh results on this wiki
		 */
		function allowFreshResults() {
			store.getWikilambdaConfig = { freshResultEnabled: true };
			store.userHasRight = jest.fn( ( right ) => right === 'wikilambda-abstract-request-fresh-result' );
		}

		it.each( [
			[ 'it came from the fragment store', { fromFragmentStore: true, metadata: null } ],
			[ 'it came from the function-call cache', { metadata: { functionCallCachedOn: '2026-10-24T00:47:20Z' } } ],
			[ 'it used cached Wikidata entities', { metadata: { cachedWikidataEntities: [ 'Z6', 'Q42' ] } } ],
			[ 'it is a stored failure', { hasError: true, fromFragmentStore: true, metadata: null } ]
		] )( 'offers the button for a render that is not completely fresh: %s', ( _, preview ) => {
			allowFreshResults();
			const wrapper = renderProvenance( Object.assign( { renderDate: '20261024004720' }, preview ) );

			const button = findButton( wrapper );
			expect( button.exists() ).toBe( true );
			expect( button.text() ).toBe( 'Run with latest data' );
			expect( button.classes() ).toContain( 'cdx-button--action-progressive' );
			expect( button.classes() ).toContain( 'cdx-button--weight-quiet' );
		} );

		it.each( [
			[ 'a fresh render', { metadata: { functionCallFreshResult: '2026-10-24T00:47:20Z' } } ],
			[ 'no render to describe (e.g. pending)', { isPending: true, metadata: null } ]
		] )( 'does not offer the button for %s', ( _, preview ) => {
			allowFreshResults();
			const wrapper = renderProvenance( preview );

			expect( findButton( wrapper ).exists() ).toBe( false );
		} );

		it( 'does not offer the button when the wiki does not allow fresh results', () => {
			allowFreshResults();
			store.getWikilambdaConfig = { freshResultEnabled: false };
			const wrapper = renderProvenance( { fromFragmentStore: true } );

			expect( findButton( wrapper ).exists() ).toBe( false );
		} );

		it( 'does not offer the button to a user without the right', () => {
			allowFreshResults();
			store.userHasRight = jest.fn().mockReturnValue( false );
			const wrapper = renderProvenance( { fromFragmentStore: true } );

			expect( findButton( wrapper ).exists() ).toBe( false );
			expect( store.userHasRight ).toHaveBeenCalledWith( 'wikilambda-abstract-request-fresh-result' );
		} );

		it( 'asks for a fresh render when the button is clicked', async () => {
			allowFreshResults();
			const wrapper = renderProvenance( { fromFragmentStore: true } );

			await findButton( wrapper ).trigger( 'click' );

			expect( wrapper.emitted( 'request-fresh' ) ).toHaveLength( 1 );
		} );

		it( 'disables the button while a request runs', () => {
			allowFreshResults();
			const wrapper = renderProvenance( { fromFragmentStore: true }, { isLoading: true, error: null } );

			expect( findButton( wrapper ).attributes( 'disabled' ) ).toBeDefined();
		} );

		it( 'shows the message of a failed request', () => {
			allowFreshResults();
			const wrapper = renderProvenance(
				{ fromFragmentStore: true },
				{ isLoading: false, error: 'You have exceeded your rate limit.' }
			);

			const message = wrapper.find( '.ext-wikilambda-app-abstract-preview-provenance__error' );
			expect( message.exists() ).toBe( true );
			expect( message.text() ).toContain( 'You have exceeded your rate limit.' );
		} );
	} );
} );
