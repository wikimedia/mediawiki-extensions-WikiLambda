/*!
 * WikiLambda unit test suite for the AbstractContent component.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const { nextTick } = require( 'vue' );
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
					'wl-publish-dialog': true,
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

	it( 'does not show publish button when edit=false', () => {
		const wrapper = renderAbstractContent( { edit: false } );

		expect( wrapper.find( '.ext-wikilambda-app-abstract-content__publish' ).exists() ).toBe( false );
	} );

	it( 'disables publish button when content is not dirty', () => {
		store.isDirty = false;

		const wrapper = renderAbstractContent();

		const publishButton = wrapper.find( '.ext-wikilambda-app-abstract-content__publish' );

		expect( publishButton.exists() ).toBe( true );
		expect( publishButton.attributes( 'disabled' ) ).toBeDefined();
	} );

	it( 'enables publish button when content is dirty', () => {
		store.isDirty = true;

		const wrapper = renderAbstractContent();

		const publishButton = wrapper.find( '.ext-wikilambda-app-abstract-content__publish' );

		expect( publishButton.exists() ).toBe( true );
		expect( publishButton.attributes( 'disabled' ) ).not.toBeDefined();
	} );

	it( 'opens publish dialog when clicking publish and content is valid', async () => {
		const wrapper = renderAbstractContent();

		// Publish dialog is not visible
		const publishDialog = wrapper.findComponent( { name: 'wl-publish-dialog' } );
		expect( publishDialog.props( 'showDialog' ) ).toBe( false );

		// Click publish button
		const publishButton = wrapper.find( '.ext-wikilambda-app-abstract-content__publish' );
		publishButton.trigger( 'click' );

		// Publish dialog becomes visible
		await waitFor( () => expect( publishDialog.props( 'showDialog' ) ).toBe( true ) );
	} );

	it( 'does not open publish dialog if content validation fails', async () => {
		store.validateAbstractWikiContent.mockReturnValue( false );

		const wrapper = renderAbstractContent();

		// Publish dialog is not visible
		const publishDialog = wrapper.findComponent( { name: 'wl-publish-dialog' } );
		expect( publishDialog.props( 'showDialog' ) ).toBe( false );

		// Click publish button
		const publishButton = wrapper.find( '.ext-wikilambda-app-abstract-content__publish' );
		publishButton.trigger( 'click' );

		// Allow all promises and ticks to flush
		await Promise.resolve();
		await wrapper.vm.$nextTick();

		// Publish dialog never opened
		expect( publishDialog.props( 'showDialog' ) ).toBe( false );
	} );

	it( 'closes publish dialog when closePublishDialog is called', async () => {
		const wrapper = renderAbstractContent();

		wrapper.vm.showPublishDialog = true;
		await nextTick();

		wrapper.vm.closePublishDialog();
		await nextTick();

		expect( wrapper.vm.showPublishDialog ).toBe( false );
	} );
} );
