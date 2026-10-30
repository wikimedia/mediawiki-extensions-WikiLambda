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
		store.getInteractionData = {
			zobjectid: 'Q42',
			zobjecttype: 'abstractwiki',
			zlang: 'Z1002',
			action_source: 'abstractwiki'
		};
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

	describe( 'Event logging', () => {
		it( 'emits cancel event when the user leaves the page', async () => {
			// Leave at once, with no confirmation dialog
			store.isDirty = false;

			renderAbstractPublish();

			// The leave-editor composable adds its click handler to the window,
			// which the test replaces with a mock. Take the handler from the mock.
			const [ , handleClickAway ] = window.addEventListener.mock.calls
				.find( ( [ eventName ] ) => eventName === 'click' );

			const link = document.createElement( 'a' );
			link.href = 'https://example.com/leave';

			handleClickAway( { target: link, button: 0, preventDefault: jest.fn() } );

			await waitFor( () => expect( mw.testKitchen.getInstrument().send )
				.toHaveBeenCalledWith( 'cancel', store.getInteractionData ) );
		} );
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

	it( 'enables publish button if oldid', () => {
		store.isDirty = false;
		store.isCreateNewPage = false;
		store.getQueryParams = {
			oldid: '12345'
		};

		const wrapper = renderAbstractPublish();

		const publishButton = wrapper.find( '.ext-wikilambda-app-abstract-publish__publish' );
		expect( publishButton.exists() ).toBe( true );
		expect( publishButton.attributes( 'disabled' ) ).not.toBe( 'true' );
	} );

	it( 'enables publish button if the undo content loaded', () => {
		store.isDirty = false;
		store.isCreateNewPage = false;
		store.getQueryParams = {
			undo: '12345',
			undoafter: '12344'
		};
		store.getWikilambdaConfig = { undo: { rev: 12345, after: 12344 } };

		const wrapper = renderAbstractPublish();

		const publishButton = wrapper.find( '.ext-wikilambda-app-abstract-publish__publish' );
		expect( publishButton.attributes( 'disabled' ) ).toBe( 'false' );
	} );

	it( 'disables publish button if the undo failed', () => {
		store.isDirty = false;
		store.isCreateNewPage = false;
		store.getQueryParams = {
			undo: '12345',
			undoafter: '12344'
		};
		store.getWikilambdaConfig = {};

		const wrapper = renderAbstractPublish();

		const publishButton = wrapper.find( '.ext-wikilambda-app-abstract-publish__publish' );
		expect( publishButton.attributes( 'disabled' ) ).toBe( 'true' );
	} );

	it( 'opens publish dialog when clicking publish and content is valid', async () => {
		const wrapper = renderAbstractPublish();

		const publishDialog = wrapper.findComponent( { name: 'wl-publish-dialog' } );
		expect( publishDialog.props( 'showDialog' ) ).toBe( false );

		const publishButton = wrapper.find( '.ext-wikilambda-app-abstract-publish__publish' );
		publishButton.trigger( 'click' );

		await waitFor( () => expect( publishDialog.props( 'showDialog' ) ).toBe( true ) );
	} );

	it( 'sets a publish warning before opening dialog when there are empty reference errors', async () => {
		store.getErrorPaths = [ 'abstractwiki.sections.Q8776414.fragments.2.Z12781K2' ];
		store.getErrors = jest.fn().mockReturnValue( [ { messageKey: 'wikilambda-empty-reference-warning' } ] );
		store.setError = jest.fn();

		const wrapper = renderAbstractPublish();
		const publishButton = wrapper.find( '.ext-wikilambda-app-abstract-publish__publish' );
		publishButton.trigger( 'click' );

		await waitFor( () => {
			expect( store.setError ).toHaveBeenCalledWith( {
				errorId: 'main',
				errorMessageKey: 'wikilambda-empty-references-publish-warning',
				errorType: 'warning'
			} );
			expect( wrapper.findComponent( { name: 'wl-publish-dialog' } ).props( 'showDialog' ) ).toBe( true );
		} );
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
