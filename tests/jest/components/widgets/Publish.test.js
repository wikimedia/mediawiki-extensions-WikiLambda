/*!
 * WikiLambda unit test suite for the Publish widget.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	{ waitFor } = require( '@testing-library/vue' ),
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	PublishWidget = require( '../../../../resources/ext.wikilambda.app/components/widgets/Publish.vue' );

describe( 'Publish widget', () => {
	let getters,
		actions;

	beforeEach( () => {
		Object.defineProperty( window, 'location', { value: { href: '' } } );
		getters = {
			getCurrentZObjectId: createGetterMock( 'Z0' ),
			getCurrentZObjectType: createGetterMock( Constants.Z_FUNCTION ),
			getCurrentZImplementationType: createGetterMock( Constants.Z_IMPLEMENTATION_CODE ),
			isCreateNewPage: createGetterMock( true ),
			getUserLangZid: createGetterMock( 'Z1002' ),
			getUserLangCode: createGetterMock( 'en' ),
			waitForRunningParsers: createGetterMock( Promise.resolve() )
		};
		actions = {
			clearValidationErrors: jest.fn(),
			validateZObject: jest.fn( () => true ),
			submitZObject: jest.fn(),
			setError: jest.fn(),
			clearAllErrors: jest.fn()
		};
		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( PublishWidget, {
			global: { stubs: { WlWidgetBase: false } }
		} );

		expect( wrapper.find( '.ext-wikilambda-publish-widget' ).exists() ).toBe( true );
	} );

	it( 'opens the publish dialog if validateZObject returns isValid true', async () => {
		const wrapper = shallowMount( PublishWidget, {
			props: { isDirty: true },
			global: { stubs: { WlWidgetBase: false, CdxButton: false } }
		} );
		const publishDialog = wrapper.findComponent( { name: 'wl-publish-dialog' } );

		wrapper.find( '.ext-wikilambda-publish-widget__publish-button' ).trigger( 'click' );

		await waitFor( () => expect( publishDialog.props( 'showDialog' ) ).toBe( true ) );
		expect( wrapper.emitted( 'start-publish' ) ).toBeTruthy();
	} );

	it( 'does not open the publish dialog if validateZObject returns isValid false', async () => {
		actions.validateZObject = jest.fn( () => false );
		global.store.hotUpdate( { actions: actions } );

		const wrapper = shallowMount( PublishWidget, {
			global: { stubs: { WlWidgetBase: false } }
		} );

		wrapper.find( '.ext-wikilambda-publish-widget__publish-button' ).trigger( 'click' );

		const publishDialog = wrapper.findComponent( { name: 'wl-publish-dialog' } );
		await waitFor( () => expect( publishDialog.props( 'showDialog' ) ).toBe( false ) );
	} );

	it( 'opens the leave confirmation dialog if page is dirty', async () => {
		const wrapper = shallowMount( PublishWidget, {
			props: { isDirty: true },
			global: { stubs: { WlWidgetBase: false, CdxButton: false } }
		} );

		wrapper.find( '.ext-wikilambda-publish-widget__cancel-button' ).trigger( 'click' );

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

		wrapper.find( '.ext-wikilambda-publish-widget__cancel-button' ).trigger( 'click' );

		const leaveDialog = wrapper.findComponent( { name: 'wl-leave-editor-dialog' } );
		await waitFor( () => expect( window.location.href ).not.toEqual( '' ) );
		expect( wrapper.emitted( 'start-cancel' ) ).toBeTruthy();
		expect( leaveDialog.props( 'showDialog' ) ).toBe( false );
		expect( wrapper.vm.leaveEditorCallback ).toBeUndefined();
		expect( wrapper.vm.showLeaveEditorDialog ).toBe( false );
	} );

	it( 'redirects to main page if we cancel from a create page', async () => {
		getters.isCreateNewPage = createGetterMock( true );
		global.store.hotUpdate( { getters: getters } );

		const wrapper = shallowMount( PublishWidget, {
			props: { isDirty: false },
			global: { stubs: { WlWidgetBase: false, CdxButton: false } }
		} );

		wrapper.vm.leaveTo = jest.fn();
		wrapper.find( '.ext-wikilambda-publish-widget__cancel-button' ).trigger( 'click' );

		const targetUrl = '/wiki/Wikifunctions:Main_Page';
		expect( wrapper.vm.leaveTo ).toHaveBeenCalledWith( targetUrl );
	} );

	it( 'redirects to object view page if we cancel from an edit page', () => {
		getters.isCreateNewPage = createGetterMock( false );
		getters.getCurrentZObjectId = createGetterMock( 'Z10001' );
		global.store.hotUpdate( { getters: getters } );

		const wrapper = shallowMount( PublishWidget, {
			props: { isDirty: false },
			global: { stubs: { WlWidgetBase: false, CdxButton: false } }
		} );

		wrapper.vm.leaveTo = jest.fn();
		wrapper.find( '.ext-wikilambda-publish-widget__cancel-button' ).trigger( 'click' );

		const targetUrl = '/view/en/Z10001';
		expect( wrapper.vm.leaveTo ).toHaveBeenCalledWith( targetUrl );
	} );

	describe( 'Event logging', () => {

		it( 'emits cancel event when leaving a create function page', async () => {
			getters.isCreateNewPage = createGetterMock( true );
			getters.getCurrentZObjectType = createGetterMock( 'Z8' );
			getters.getCurrentZImplementationType = createGetterMock( undefined );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( PublishWidget, {
				props: { isDirty: false },
				global: { stubs: { WlWidgetBase: false, CdxButton: false } }
			} );

			wrapper.find( '.ext-wikilambda-publish-widget__cancel-button' ).trigger( 'click' );

			const eventName = 'wf.ui.editFunction.cancel';
			const eventData = {
				implementationtype: null,
				isdirty: false,
				isnewzobject: true,
				zlang: 'Z1002',
				zobjectid: 'Z0',
				zobjecttype: 'Z8'
			};

			await waitFor( () => expect( mw.eventLog.dispatch ).toHaveBeenCalledWith( eventName, eventData ) );
		} );

		it( 'emits cancel event when leaving an edit code implementation page', async () => {
			getters.isCreateNewPage = createGetterMock( false );
			getters.getCurrentZObjectId = createGetterMock( 'Z10001' );
			getters.getCurrentZObjectType = createGetterMock( 'Z14' );
			getters.getCurrentZImplementationType = createGetterMock( 'Z14K3' );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( PublishWidget, {
				props: { isDirty: false },
				global: { stubs: { WlWidgetBase: false, CdxButton: false } }
			} );

			wrapper.find( '.ext-wikilambda-publish-widget__cancel-button' ).trigger( 'click' );

			const eventName = 'wf.ui.editImplementation.cancel';
			const eventData = {
				implementationtype: 'Z14K3',
				isdirty: false,
				isnewzobject: false,
				zlang: 'Z1002',
				zobjectid: 'Z10001',
				zobjecttype: 'Z14'
			};

			await waitFor( () => expect( mw.eventLog.dispatch ).toHaveBeenCalledWith( eventName, eventData ) );
		} );

	} );
} );
