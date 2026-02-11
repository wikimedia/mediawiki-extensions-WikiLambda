/*!
 * WikiLambda unit test suite for the AbstractContent component.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractContent = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractContent.vue' );

describe( 'AbstractContent', () => {
	let store;

	const mockSections = [ {
		index: 0,
		fragments: [ 'Z89' ],
		fragmentsPath: 'abstractwiki.sections.Q8776414.fragments',
		isLede: true,
		labelData: { label: 'Abstract Wikipedia' },
		qid: 'Q8776414'
	} ];

	function renderAbstractContent( props = {} ) {
		return shallowMount( AbstractContent, {
			props: {
				edit: true,
				...props
			},
			global: {
				stubs: {
					'wl-widget-base': false,
					'wl-abstract-content-section': true,
					'wl-abstract-publish': false,
					'wl-publish-dialog': true,
					'wl-leave-editor-dialog': true,
					'cdx-button': false
				}
			}
		} );
	}

	beforeEach( () => {
		store = useMainStore();

		// Store state
		store.isDirty = true;
		store.getAbstractContentSections = mockSections;
		store.validateAbstractWikiContent = jest.fn().mockReturnValue( true );
		store.submitAbstractWikiContent = jest.fn();
		store.waitForRunningParsers = Promise.resolve();
	} );

	it( 'renders without errors', () => {
		const wrapper = renderAbstractContent();

		expect( wrapper.find( '.ext-wikilambda-app-abstract-content' ).exists() ).toBe( true );
	} );

	it( 'renders one section component per section', () => {
		const wrapper = renderAbstractContent();

		const sections = wrapper.findAllComponents( { name: 'wl-abstract-content-section' } );

		expect( sections.length ).toBe( 1 );
		expect( sections[ 0 ].props( 'section' ) ).toEqual( mockSections[ 0 ] );
	} );

	it( 'does not show publish widget when edit=false', () => {
		const wrapper = renderAbstractContent( { edit: false } );

		expect( wrapper.findComponent( { name: 'wl-abstract-publish' } ).exists() ).toBe( false );
	} );

	it( 'shows publish widget when edit=true', () => {
		const wrapper = renderAbstractContent();

		expect( wrapper.findComponent( { name: 'wl-abstract-publish' } ).exists() ).toBe( true );
	} );
} );
