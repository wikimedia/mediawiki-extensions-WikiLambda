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

	beforeEach( () => {
		store = useMainStore();
		store.getCurrentZObjectId = 'Z0';
		store.getCurrentZObjectType = Constants.Z_FUNCTION;
		store.getCurrentZImplementationType = Constants.Z_IMPLEMENTATION_CODE;
		store.isCreateNewPage = true;
		store.getUserLangZid = 'Z1002';
		store.getUserLangCode = 'en';
		store.waitForRunningParsers = Promise.resolve();
		store.validateZObject.mockReturnValue( true );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( PublishWidget, {
			global: { stubs: { WlWidgetBase: false } }
		} );

		expect( wrapper.find( '.ext-wikilambda-app-publish-widget' ).exists() ).toBe( true );
	} );

	it( 'opens the publish dialog if validateZObject returns isValid true', async () => {
		const wrapper = shallowMount( PublishWidget, {
			props: { isDirty: true },
			global: { stubs: { WlWidgetBase: false, CdxButton: false } }
		} );
		const publishDialog = wrapper.findComponent( { name: 'wl-publish-dialog' } );

		wrapper.find( '.ext-wikilambda-app-publish-widget__publish-button' ).trigger( 'click' );

		await waitFor( () => expect( publishDialog.props( 'showDialog' ) ).toBe( true ) );
		expect( wrapper.emitted( 'start-publish' ) ).toBeTruthy();
	} );

	it( 'does not open the publish dialog if validateZObject returns isValid false', async () => {
		store.validateZObject.mockReturnValue( false );

		const wrapper = shallowMount( PublishWidget, {
			global: { stubs: { WlWidgetBase: false } }
		} );

		wrapper.find( '.ext-wikilambda-app-publish-widget__publish-button' ).trigger( 'click' );

		const publishDialog = wrapper.findComponent( { name: 'wl-publish-dialog' } );
		await waitFor( () => expect( publishDialog.props( 'showDialog' ) ).toBe( false ) );
	} );

	it( 'opens the leave confirmation dialog if page is dirty', async () => {
		const wrapper = shallowMount( PublishWidget, {
			props: { isDirty: true },
			global: { stubs: { WlWidgetBase: false, CdxButton: false } }
		} );

		wrapper.find( '.ext-wikilambda-app-publish-widget__cancel-button' ).trigger( 'click' );

		const leaveDialog = wrapper.findComponent( { name: 'wl-leave-editor-dialog' } );
		await waitFor( () => expect( leaveDialog.props( 'showDialog' ) ).toBe( true ) );

		expect( wrapper.emitted( 'start-cancel' ) ).toBeTruthy();
		expect( wrapper.vm.leaveEditorCallback ).toBeDefined();
	} );

	it( 'leaves immediately if page is not dirty', async () => {
		const wrapper = shallowMount( PublishWidget, {
			props: { isDirty: false },
			global: { stubs: { WlWidgetBase: false, CdxButton: false } }
		} );

		wrapper.find( '.ext-wikilambda-app-publish-widget__cancel-button' ).trigger( 'click' );

		const leaveDialog = wrapper.findComponent( { name: 'wl-leave-editor-dialog' } );
		await waitFor( () => expect( window.location.href ).not.toEqual( '' ) );
		expect( wrapper.emitted( 'start-cancel' ) ).toBeTruthy();
		expect( leaveDialog.props( 'showDialog' ) ).toBe( false );
		expect( wrapper.vm.leaveEditorCallback ).toBeUndefined();
		expect( wrapper.vm.showLeaveEditorDialog ).toBe( false );
	} );

	it( 'redirects to main page if we cancel from a create page', async () => {
		store.isCreateNewPage = true;

		const wrapper = shallowMount( PublishWidget, {
			props: { isDirty: false },
			global: { stubs: { WlWidgetBase: false, CdxButton: false } }
		} );

		wrapper.vm.leaveTo = jest.fn();
		wrapper.find( '.ext-wikilambda-app-publish-widget__cancel-button' ).trigger( 'click' );

		const targetUrl = '/wiki/Wikifunctions:Main_Page';
		expect( wrapper.vm.leaveTo ).toHaveBeenCalledWith( targetUrl );
	} );

	it( 'redirects to object view page if we cancel from an edit page', () => {
		store.isCreateNewPage = false;
		store.getCurrentZObjectId = 'Z10001';

		const wrapper = shallowMount( PublishWidget, {
			props: { isDirty: false },
			global: { stubs: { WlWidgetBase: false, CdxButton: false } }
		} );

		wrapper.vm.leaveTo = jest.fn();
		wrapper.find( '.ext-wikilambda-app-publish-widget__cancel-button' ).trigger( 'click' );

		const targetUrl = '/view/en/Z10001';
		expect( wrapper.vm.leaveTo ).toHaveBeenCalledWith( targetUrl );
	} );

	describe( 'Event logging', () => {

		it( 'emits cancel event when leaving a create function page', async () => {
			store.isCreateNewPage = true;
			store.getCurrentZObjectType = 'Z8';
			store.getCurrentZImplementationType = undefined;

			const wrapper = shallowMount( PublishWidget, {
				props: { isDirty: false },
				global: { stubs: { WlWidgetBase: false, CdxButton: false } }
			} );

			wrapper.find( '.ext-wikilambda-app-publish-widget__cancel-button' ).trigger( 'click' );

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

			const wrapper = shallowMount( PublishWidget, {
				props: { isDirty: false },
				global: { stubs: { WlWidgetBase: false, CdxButton: false } }
			} );

			wrapper.find( '.ext-wikilambda-app-publish-widget__cancel-button' ).trigger( 'click' );

			const streamName = 'mediawiki.product_metrics.wikifunctions_ui';
			const schemaID = '/analytics/mediawiki/product_metrics/wikilambda/ui_actions/1.0.0';
			const action = 'cancel';
			const interactionData = { implementationtype: 'Z14K3', zlang: 'Z1002', zobjectid: 'Z10001', zobjecttype: 'Z14' };

			await waitFor( () => expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith( streamName, schemaID, action, interactionData ) );
		} );

	} );
} );
