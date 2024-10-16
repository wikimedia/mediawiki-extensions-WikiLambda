/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	{ waitFor } = require( '@testing-library/vue' ),
	createGetterMock = require( '../../../helpers/getterHelpers.js' ).createGetterMock,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	FunctionEditorFooter = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorFooter.vue' );

describe( 'FunctionEditorFooter', () => {

	let getters,
		actions;

	beforeEach( () => {
		getters = {
			getUserLangZid: createGetterMock( 'Z1002' ),
			getCurrentZObjectId: createGetterMock( 'Z0' ),
			isCreateNewPage: createGetterMock( true )
		};
		actions = {
			setError: jest.fn()
		};
		global.store.hotUpdate( {
			actions: actions,
			getters: getters
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionEditorFooter );
		expect( wrapper.find( '.ext-wikilambda-app-function-editor-footer' ).exists() ).toBeTruthy();
	} );

	it( 'displays the PublishWidget component', () => {
		const wrapper = shallowMount( FunctionEditorFooter, {
			props: {
				functionInputChanged: false,
				functionOutputChanged: false,
				isFunctionDirty: false
			},
			global: { stubs: { WlPublishWidget: false } }
		} );
		expect( wrapper.find( '.ext-wikilambda-app-publish-widget' ).exists() ).toBeTruthy();
	} );

	it( 'raises input function warnings if input has changed while editing and at least one test or implementation is connected', async () => {
		getters.isCreateNewPage = createGetterMock( false );
		getters.getConnectedTests = createGettersWithFunctionsMock( [ ] );
		getters.getConnectedImplementations = createGettersWithFunctionsMock( [ 'Z444' ] );
		global.store.hotUpdate( { getters: getters } );

		const wrapper = shallowMount( FunctionEditorFooter, {
			props: {
				functionInputChanged: true,
				functionOutputChanged: false,
				isFunctionDirty: false
			},
			global: { stubs: {
				WlPublishWidget: false,
				WlWidgetBase: false,
				CdxButton: false
			} }
		} );

		const publishWidget = wrapper.findComponent( { name: 'wl-publish-widget' } );
		publishWidget.vm.$emit( 'start-publish' );

		const errorPayload = {
			rowId: 0,
			errorType: Constants.errorTypes.WARNING,
			errorCode: Constants.errorCodes.FUNCTION_INPUT_CHANGED
		};
		expect( actions.setError ).toHaveBeenCalledWith( expect.anything(), errorPayload );
	} );

	it( 'raises output function warnings if output has changed while editing and at least one test or implementation is connected', async () => {
		getters.isCreateNewPage = createGetterMock( false );
		getters.getConnectedTests = createGettersWithFunctionsMock( [ 'Z222' ] );
		getters.getConnectedImplementations = createGettersWithFunctionsMock( [ 'Z444' ] );
		global.store.hotUpdate( { getters: getters } );

		const wrapper = shallowMount( FunctionEditorFooter, {
			props: {
				functionInputChanged: false,
				functionOutputChanged: true,
				isFunctionDirty: false
			},
			global: { stubs: {
				WlPublishWidget: false,
				WlWidgetBase: false,
				CdxButton: false
			} }
		} );

		const publishWidget = wrapper.findComponent( { name: 'wl-publish-widget' } );
		publishWidget.vm.$emit( 'start-publish' );

		const errorPayload = {
			rowId: 0,
			errorType: Constants.errorTypes.WARNING,
			errorCode: Constants.errorCodes.FUNCTION_OUTPUT_CHANGED
		};
		expect( actions.setError ).toHaveBeenCalledWith( expect.anything(), errorPayload );
	} );

	it( 'raises input + output function warnings if input and output have changed while editing and at least one test or implementation is connected', async () => {
		getters.isCreateNewPage = createGetterMock( false );
		getters.getConnectedTests = createGettersWithFunctionsMock( [ 'Z222' ] );
		getters.getConnectedImplementations = createGettersWithFunctionsMock( [ ] );
		global.store.hotUpdate( { getters: getters } );

		const wrapper = shallowMount( FunctionEditorFooter, {
			props: {
				functionInputChanged: true,
				functionOutputChanged: true,
				isFunctionDirty: false
			},
			global: { stubs: {
				WlPublishWidget: false,
				WlWidgetBase: false,
				CdxButton: false
			} }
		} );

		const publishWidget = wrapper.findComponent( { name: 'wl-publish-widget' } );
		publishWidget.vm.$emit( 'start-publish' );

		const errorPayload = {
			rowId: 0,
			errorType: Constants.errorTypes.WARNING,
			errorCode: Constants.errorCodes.FUNCTION_INPUT_OUTPUT_CHANGED
		};
		expect( actions.setError ).toHaveBeenCalledWith( expect.anything(), errorPayload );
	} );

	it( 'does not raise function warnings if there are no connected tests and implementations', async () => {
		getters.isCreateNewPage = createGetterMock( false );
		getters.getConnectedTests = createGettersWithFunctionsMock( [] );
		getters.getConnectedImplementations = createGettersWithFunctionsMock( [] );
		global.store.hotUpdate( { getters: getters } );

		const wrapper = shallowMount( FunctionEditorFooter, {
			props: {
				functionInputChanged: true,
				functionOutputChanged: false,
				isFunctionDirty: false
			},
			global: { stubs: {
				WlPublishWidget: false,
				WlWidgetBase: false,
				CdxButton: false
			} }
		} );

		const publishWidget = wrapper.findComponent( { name: 'wl-publish-widget' } );
		publishWidget.vm.$emit( 'start-publish' );

		expect( actions.setError ).not.toHaveBeenCalled();
	} );

	it( 'does not raise function warnings if this is  new page', async () => {
		getters.isCreateNewPage = createGetterMock( true );
		global.store.hotUpdate( { getters: getters } );

		const wrapper = shallowMount( FunctionEditorFooter, {
			props: {
				functionInputChanged: true,
				functionOutputChanged: false,
				isFunctionDirty: false
			},
			global: { stubs: {
				WlPublishWidget: false,
				WlWidgetBase: false,
				CdxButton: false
			} }
		} );

		const publishWidget = wrapper.findComponent( { name: 'wl-publish-widget' } );
		publishWidget.vm.$emit( 'start-publish' );

		expect( actions.setError ).not.toHaveBeenCalled();
	} );

	it( 'calls the submitInteraction method when isFunctionDirty is set to true', async () => {
		getters.isCreateNewPage = createGetterMock( false );
		getters.getConnectedTests = createGettersWithFunctionsMock( [] );
		getters.getConnectedImplementations = createGettersWithFunctionsMock( [] );
		global.store.hotUpdate( { getters: getters } );

		const wrapper = shallowMount( FunctionEditorFooter, {
			props: {
				functionInputChanged: false,
				functionOutputChanged: false,
				isFunctionDirty: false
			},
			global: { stubs: {
				WlPublishWidget: false,
				WlWidgetBase: false,
				CdxButton: false
			} }
		} );

		await wrapper.setProps( { isFunctionDirty: true } );

		const streamName = 'mediawiki.product_metrics.wikifunctions_ui';
		const schemaID = '/analytics/mediawiki/product_metrics/wikilambda/ui_actions/1.0.0';
		const action = 'change';
		const interactionData = { zlang: 'Z1002', zobjectid: 'Z0', zobjecttype: 'Z8' };

		await waitFor( () => expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith( streamName, schemaID, action, interactionData ) );
	} );

} );
