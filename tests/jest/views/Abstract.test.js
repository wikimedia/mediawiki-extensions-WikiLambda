/*!
 * WikiLambda unit test suite for the Abstract view.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractView = require( '../../../resources/ext.wikilambda.app/views/Abstract.vue' );

describe( 'Abstract view', () => {
	let store;

	function renderAbstractView( options = {} ) {
		return shallowMount( AbstractView, {
			global: {
				stubs: {
					'wl-abstract-title': true,
					'wl-abstract-content': true,
					'wl-abstract-preview': true
				}
			},
			...options
		} );
	}

	beforeEach( () => {
		store = useMainStore();

		// Default store state
		store.getAbstractWikiId = null;
		store.getViewMode = false;
	} );

	it( 'renders without errors', () => {
		const wrapper = renderAbstractView();

		expect( wrapper.find( '.ext-wikilambda-app-abstract-view' ).exists() ).toBe( true );
	} );

	it( 'shows title selector component when no qid is set', () => {
		store.getAbstractWikiId = null;

		const wrapper = renderAbstractView();

		expect( wrapper.findComponent( { name: 'wl-abstract-title' } ).exists() ).toBe( true );
		expect( wrapper.findComponent( { name: 'wl-abstract-content' } ).exists() ).toBe( false );
		expect( wrapper.findComponent( { name: 'wl-abstract-preview' } ).exists() ).toBe( false );
	} );

	it( 'shows content and preview components when qid is set', () => {
		store.getAbstractWikiId = 'Q42';

		const wrapper = renderAbstractView();

		expect( wrapper.findComponent( { name: 'wl-abstract-title' } ).exists() ).toBe( false );
		expect( wrapper.findComponent( { name: 'wl-abstract-content' } ).exists() ).toBe( true );
		expect( wrapper.findComponent( { name: 'wl-abstract-preview' } ).exists() ).toBe( true );
	} );

	it( 'passes edit=true when not in view mode', () => {
		store.getViewMode = false;
		store.getAbstractWikiId = 'Q42';

		const wrapper = renderAbstractView();

		expect( wrapper.findComponent( { name: 'wl-abstract-content' } ).props( 'edit' ) ).toBe( true );
	} );

	it( 'passes edit=false when in view mode', () => {
		store.getViewMode = true;
		store.getAbstractWikiId = 'Q42';

		const wrapper = renderAbstractView();

		expect( wrapper.findComponent( { name: 'wl-abstract-content' } ).props( 'edit' ) ).toBe( false );
	} );

	it( 'emits mounted event on mount', () => {
		const wrapper = renderAbstractView();

		expect( wrapper.emitted( 'mounted' ) ).toBeTruthy();
		expect( wrapper.emitted( 'mounted' ).length ).toBe( 1 );
	} );
} );
