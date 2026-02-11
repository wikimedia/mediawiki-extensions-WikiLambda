/*!
 * WikiLambda unit test suite for the AbstractPublish component.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractPublish = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractPublish.vue' );

describe( 'AbstractPublish', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.isDirty = true;
		store.validateAbstractWikiContent = jest.fn().mockReturnValue( true );
		store.submitAbstractWikiContent = jest.fn();
		store.waitForRunningParsers = Promise.resolve();
		jest.spyOn( window, 'addEventListener' ).mockImplementation( () => {} );
		jest.spyOn( window, 'removeEventListener' ).mockImplementation( () => {} );
	} );

	afterEach( () => {
		window.addEventListener.mockRestore();
		window.removeEventListener.mockRestore();
	} );

	function renderAbstractPublish() {
		return shallowMount( AbstractPublish, {
			global: {
				stubs: {
					'wl-publish-dialog': true,
					'wl-leave-editor-dialog': true
				}
			}
		} );
	}

	it( 'renders without errors', () => {
		const wrapper = renderAbstractPublish();

		expect( wrapper.find( '.ext-wikilambda-app-abstract-publish' ).exists() ).toBe( true );
	} );

	it( 'disables publish button when content is not dirty', () => {
		store.isDirty = false;

		const wrapper = renderAbstractPublish();

		const publishButton = wrapper.find( '.ext-wikilambda-app-abstract-publish__publish' );
		expect( publishButton.exists() ).toBe( true );
		expect( publishButton.attributes( 'disabled' ) ).toBeDefined();
	} );

	it( 'enables publish button when content is dirty', () => {
		store.isDirty = true;

		const wrapper = renderAbstractPublish();

		const publishButton = wrapper.find( '.ext-wikilambda-app-abstract-publish__publish' );
		expect( publishButton.exists() ).toBe( true );
		expect( publishButton.attributes( 'disabled' ) ).not.toBe( 'true' );
	} );

	it( 'opens publish dialog when clicking publish and content is valid', async () => {
		const wrapper = renderAbstractPublish();

		const publishDialog = wrapper.findComponent( { name: 'wl-publish-dialog' } );
		expect( publishDialog.props( 'showDialog' ) ).toBe( false );

		const publishButton = wrapper.find( '.ext-wikilambda-app-abstract-publish__publish' );
		publishButton.trigger( 'click' );

		await waitFor( () => expect( publishDialog.props( 'showDialog' ) ).toBe( true ) );
	} );

	it( 'does not open publish dialog if content validation fails', async () => {
		store.validateAbstractWikiContent.mockReturnValue( false );

		const wrapper = renderAbstractPublish();

		const publishDialog = wrapper.findComponent( { name: 'wl-publish-dialog' } );
		expect( publishDialog.props( 'showDialog' ) ).toBe( false );

		const publishButton = wrapper.find( '.ext-wikilambda-app-abstract-publish__publish' );
		publishButton.trigger( 'click' );

		await Promise.resolve();

		expect( publishDialog.props( 'showDialog' ) ).toBe( false );
	} );
} );
