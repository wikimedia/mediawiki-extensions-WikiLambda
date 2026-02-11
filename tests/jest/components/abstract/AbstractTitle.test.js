/*!
 * WikiLambda unit test suite for the AbstractTitle component.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractTitle = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractTitle.vue' );

const getMockPageInfo = ( pages ) => ( {
	query: {
		normalized: [ {
			from: 'Abstract_Wikipedia:Q42',
			to: 'Abstract Wikipedia:Q42'
		} ],
		pages
	}
} );

const mockPageExists = getMockPageInfo( [ {
	pageid: 22706,
	ns: 2300,
	title: 'Abstract Wikipedia:Q42',
	contentmodel: 'abstractwiki'
} ] );

const mockPageMissing = getMockPageInfo( [ {
	ns: 2300,
	title: 'Abstract Wikipedia:Q42',
	missing: true,
	contentmodel: 'abstractwiki'
} ] );

describe( 'AbstractTitle', () => {
	let store;
	let getMock;

	function renderAbstractTitle() {
		return shallowMount( AbstractTitle, {
			global: {
				stubs: {
					'wl-widget-base': false,
					'wl-wikidata-entity-selector': true,
					'cdx-button': false,
					'cdx-field': false,
					'cdx-message': false,
					'cdx-progress-indicator': true
				}
			}
		} );
	}

	beforeEach( () => {
		store = useMainStore();

		store.fetchItems = jest.fn();
		store.setAbstractWikiId = jest.fn();
		store.getAbstractWikipediaNamespace = 'Abstract Wikipedia';

		store.getItemLabelData = jest.fn().mockImplementation( ( qid ) => qid === 'Q2' ? { label: 'Douglas Adams' } : undefined );

		// fetchPageInfo mock (with existing Q42 page)
		getMock = jest.fn().mockResolvedValue( mockPageExists );
		mw.Api = jest.fn( () => ( { get: getMock } ) );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderAbstractTitle();

		expect( wrapper.find( '.ext-wikilambda-app-abstract-title' ).exists() ).toBe( true );
	} );

	it( 'initializes with empty selector and disabled button', () => {
		const wrapper = renderAbstractTitle();

		const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
		expect( lookup.exists() ).toBe( true );
		expect( lookup.vm.entityId ).toBe( null );
		expect( lookup.vm.entityLabel ).toBe( '' );

		const createButton = wrapper.findComponent( { name: 'cdx-button' } );
		expect( createButton.attributes( 'disabled' ) ).toBeDefined();
	} );

	it( 'fetches page info when an item is selected', async () => {
		const wrapper = renderAbstractTitle();

		const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
		lookup.vm.$emit( 'select-wikidata-entity', 'Q42' );

		await waitFor( () => {
			expect( wrapper.vm.itemId ).toBe( 'Q42' );
		} );
		expect( wrapper.vm.isLoading ).toBe( true );
		expect( store.fetchItems ).toHaveBeenCalledWith( {
			ids: [ 'Q42' ]
		} );

		expect( getMock ).toHaveBeenCalledTimes( 1 );
		expect( getMock ).toHaveBeenCalledWith( {
			action: 'query',
			prop: 'info',
			titles: [ 'Abstract Wikipedia:Q42' ],
			format: 'json',
			formatversion: '2'
		}, { signal: undefined } );
	} );

	it( 'enables create button when selected item has no abstract page', async () => {
		getMock = jest.fn().mockResolvedValue( mockPageMissing );

		const wrapper = renderAbstractTitle();

		const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
		lookup.vm.$emit( 'select-wikidata-entity', 'Q42' );

		// Wait till promises resolve and status is no longer loading

		await Promise.resolve();
		await waitFor( () => {
			expect( wrapper.vm.isLoading ).toBe( false );
		} );

		const createButton = wrapper.findComponent( { name: 'cdx-button' } );
		expect( createButton.attributes( 'disabled' ) ).not.toBeDefined();
	} );

	it( 'shows warning message if abstract page already exists', async () => {
		getMock = jest.fn().mockResolvedValue( mockPageExists );

		const wrapper = renderAbstractTitle();

		const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
		lookup.vm.$emit( 'select-wikidata-entity', 'Q42' );

		// Wait till promises resolve and status is no longer loading

		await Promise.resolve();
		await waitFor( () => {
			expect( wrapper.vm.isLoading ).toBe( false );
		} );

		const createButton = wrapper.findComponent( { name: 'cdx-button' } );
		expect( createButton.attributes( 'disabled' ) ).toBeDefined();

		const warningMessage = wrapper.findComponent( { name: 'cdx-message' } );
		expect( warningMessage.exists() ).toBe( true );
		expect( warningMessage.text() ).toBe(
			'The selected Wikidata Item already has an associated Abstract Article:  (Q42)' );
	} );

	it( 'sets new Abstract Wiki content Id when clicking create', async () => {
		getMock = jest.fn().mockResolvedValue( mockPageMissing );

		const wrapper = renderAbstractTitle();

		const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
		lookup.vm.$emit( 'select-wikidata-entity', 'Q42' );

		// Wait till promises resolve and status is no longer loading

		await Promise.resolve();
		await waitFor( () => {
			expect( wrapper.vm.isLoading ).toBe( false );
		} );

		wrapper.findComponent( { name: 'cdx-button' } ).trigger( 'click' );
		expect( store.setAbstractWikiId ).toHaveBeenCalledWith( 'Q42' );
	} );

	it( 'does nothing when clicking create but creation is not allowed', async () => {
		getMock = jest.fn().mockResolvedValue( mockPageExists );

		const wrapper = renderAbstractTitle();

		const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
		lookup.vm.$emit( 'select-wikidata-entity', 'Q42' );

		// Wait till promises resolve and status is no longer loading

		await Promise.resolve();
		await waitFor( () => {
			expect( wrapper.vm.isLoading ).toBe( false );
		} );

		wrapper.findComponent( { name: 'cdx-button' } ).trigger( 'click' );
		expect( store.setAbstractWikiId ).not.toHaveBeenCalled();
	} );
} );
