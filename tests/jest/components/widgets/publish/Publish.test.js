/*!
 * WikiLambda unit test suite for the Publish widget.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const PublishWidget = require( '../../../../../resources/ext.wikilambda.app/components/widgets/publish/Publish.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'Publish widget', () => {
	let store;

	function renderPublish( props = {}, options = {} ) {
		const defaultOptions = {
			global: {
				stubs: {
					WlWidgetBase: false,
					CdxButton: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( PublishWidget, {
			props,
			...defaultOptions
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getCurrentZObjectId = 'Z0';
		store.getCurrentZObjectType = Constants.Z_FUNCTION;
		store.getCurrentZImplementationType = Constants.Z_IMPLEMENTATION_CODE;
		store.isCreateNewPage = true;
		store.getUserLangZid = 'Z1002';
		store.getUserLangCode = 'en';
		store.waitForRunningParsers = Promise.resolve();
		store.clearValidationErrors.mockReturnValue( true );
		store.validateZObject.mockReturnValue( true );
		store.getErrors = jest.fn().mockReturnValue( [] );
		store.getErrorPaths = [];
	} );

	it( 'renders without errors', () => {
		const wrapper = renderPublish();

		expect( wrapper.find( '.ext-wikilambda-app-publish-widget' ).exists() ).toBe( true );
	} );

	it( 'opens the publish dialog if validateZObject returns isValid true', async () => {
		const wrapper = renderPublish( {
			isDirty: true
		} );
		const publishDialog = wrapper.findComponent( { name: 'wl-publish-dialog' } );

		wrapper.get( '.ext-wikilambda-app-publish-widget__publish-button' ).trigger( 'click' );

		await waitFor( () => expect( publishDialog.props( 'showDialog' ) ).toBe( true ) );
		expect( wrapper.emitted( 'start-publish' ) ).toBeTruthy();
	} );

	it( 'does not open the publish dialog if validateZObject returns isValid false', async () => {
		store.validateZObject.mockReturnValue( false );

		const wrapper = renderPublish();

		wrapper.get( '.ext-wikilambda-app-publish-widget__publish-button' ).trigger( 'click' );

		const publishDialog = wrapper.findComponent( { name: 'wl-publish-dialog' } );
		await waitFor( () => expect( publishDialog.props( 'showDialog' ) ).toBe( false ) );
	} );

	it( 'opens the leave confirmation dialog if page is dirty', async () => {
		const wrapper = renderPublish( {
			isDirty: true
		} );

		wrapper.get( '.ext-wikilambda-app-publish-widget__cancel-button' ).trigger( 'click' );

		const leaveDialog = wrapper.findComponent( { name: 'wl-leave-editor-dialog' } );
		await waitFor( () => expect( leaveDialog.props( 'showDialog' ) ).toBe( true ) );

		expect( wrapper.emitted( 'start-cancel' ) ).toBeTruthy();
	} );

	it( 'leaves immediately if page is not dirty', async () => {
		const wrapper = renderPublish( {
			isDirty: false
		} );

		wrapper.get( '.ext-wikilambda-app-publish-widget__cancel-button' ).trigger( 'click' );

		const leaveDialog = wrapper.findComponent( { name: 'wl-leave-editor-dialog' } );

		// Verify that the leave dialog is not shown (showDialog should be false)
		expect( leaveDialog.props( 'showDialog' ) ).toBe( false );

		// Verify that navigation occurs immediately
		await waitFor( () => expect( window.location.href ).toEqual( '/wiki/Wikifunctions:Main_Page' ) );
		expect( wrapper.emitted( 'start-cancel' ) ).toBeTruthy();
	} );

	it( 'redirects to main page if we cancel from a create page', async () => {
		store.isCreateNewPage = true;

		const wrapper = renderPublish( {
			isDirty: false
		} );

		wrapper.get( '.ext-wikilambda-app-publish-widget__cancel-button' ).trigger( 'click' );

		// Wait for navigation to occur and verify the correct URL
		await waitFor( () => {
			expect( window.location.href ).toBe( '/wiki/Wikifunctions:Main_Page' );
		} );

	} );

	it( 'redirects to object view page if we cancel from an edit page', async () => {
		store.isCreateNewPage = false;
		store.getCurrentZObjectId = 'Z10001';

		const wrapper = renderPublish( {
			isDirty: false
		} );

		wrapper.get( '.ext-wikilambda-app-publish-widget__cancel-button' ).trigger( 'click' );

		// Wait for navigation to occur and verify the correct URL
		await waitFor( () => {
			expect( window.location.href ).toBe( '/view/en/Z10001' );
		} );

	} );

	describe( 'Event logging', () => {
		it( 'emits cancel event when leaving a create function page', async () => {
			store.isCreateNewPage = true;
			store.getCurrentZObjectType = 'Z8';
			store.getCurrentZImplementationType = undefined;

			const wrapper = renderPublish( {
				isDirty: false
			} );

			wrapper.get( '.ext-wikilambda-app-publish-widget__cancel-button' ).trigger( 'click' );

			const streamName = 'mediawiki.product_metrics.wikifunctions_ui';
			const schemaID = '/analytics/mediawiki/product_metrics/wikilambda/ui_actions/1.0.0';
			const action = 'cancel';
			const interactionData = { zlang: 'Z1002', zobjectid: 'Z0', zobjecttype: 'Z8' };

			await waitFor( () => expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith( streamName, schemaID, action, interactionData ) );
		} );

		it( 'emits cancel event when leaving an edit code implementation page', async () => {
			store.isCreateNewPage = false;
			store.getCurrentZObjectId = 'Z10001';
			store.getCurrentZObjectType = 'Z14';
			store.getCurrentZImplementationType = 'Z14K3';

			const wrapper = renderPublish( {
				isDirty: false
			} );

			wrapper.get( '.ext-wikilambda-app-publish-widget__cancel-button' ).trigger( 'click' );

			const streamName = 'mediawiki.product_metrics.wikifunctions_ui';
			const schemaID = '/analytics/mediawiki/product_metrics/wikilambda/ui_actions/1.0.0';
			const action = 'cancel';
			const interactionData = { implementationtype: 'Z14K3', zlang: 'Z1002', zobjectid: 'Z10001', zobjecttype: 'Z14' };

			await waitFor( () => expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith( streamName, schemaID, action, interactionData ) );
		} );
	} );

	describe( 'Disabling Publish button', () => {
		it( 'disables publish button if not dirty', () => {
			store.isCreateNewPage = false;
			store.getQueryParams = {};

			const wrapper = renderPublish( {
				isDirty: false
			} );

			const button = wrapper.find( '.ext-wikilambda-app-publish-widget__publish-button' );
			expect( button.attributes( 'disabled' ) ).toBeDefined();
		} );

		it( 'enables publish button if oldid', () => {
			store.isCreateNewPage = false;
			store.getQueryParams = {
				oldid: '12345'
			};

			const wrapper = renderPublish( {
				isDirty: false
			} );

			const button = wrapper.find( '.ext-wikilambda-app-publish-widget__publish-button' );
			expect( button.attributes( 'disabled' ) ).not.toBeDefined();
		} );

		it( 'enables publish button if undo', () => {
			store.isCreateNewPage = false;
			store.getQueryParams = {
				undo: '12345'
			};

			const wrapper = renderPublish( {
				isDirty: false
			} );

			const button = wrapper.find( '.ext-wikilambda-app-publish-widget__publish-button' );
			expect( button.attributes( 'disabled' ) ).not.toBeDefined();
		} );
	} );

	describe( 'Publish warnings', () => {
		it( 'adds empty reference warning when empty references exist', async () => {
			// Mock empty reference warnings in errors
			store.getErrorPaths = [ 'main.Z2K2.Z8K2' ];
			store.getErrors = jest.fn().mockReturnValue( [
				{ errorMessageKey: 'wikilambda-empty-reference-warning', type: 'warning' }
			] );

			const wrapper = renderPublish( { isDirty: true } );

			wrapper.find( '.ext-wikilambda-app-publish-widget__publish-button' ).trigger( 'click' );

			await waitFor( () => expect( store.setError ).toHaveBeenCalledWith( {
				errorId: Constants.STORED_OBJECTS.MAIN,
				errorMessageKey: 'wikilambda-empty-references-publish-warning',
				errorType: Constants.ERROR_TYPES.WARNING
			} ) );
		} );
	} );
} );
