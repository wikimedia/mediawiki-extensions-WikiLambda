/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const { createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' );
const FunctionEditorFooter = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorFooter.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'FunctionEditorFooter', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangZid = 'Z1002';
		store.getCurrentZObjectId = 'Z0';
		store.isCreateNewPage = true;
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
		store.isCreateNewPage = false;
		store.getConnectedTests = createGettersWithFunctionsMock( [] );
		store.getConnectedImplementations = createGettersWithFunctionsMock( [ 'Z444' ] );

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
			errorType: Constants.ERROR_TYPES.WARNING,
			errorCode: Constants.ERROR_CODES.FUNCTION_INPUT_CHANGED
		};
		expect( store.setError ).toHaveBeenCalledWith( errorPayload );
	} );

	it( 'raises output function warnings if output has changed while editing and at least one test or implementation is connected', async () => {
		store.isCreateNewPage = false;
		store.getConnectedTests = createGettersWithFunctionsMock( [ 'Z222' ] );
		store.getConnectedImplementations = createGettersWithFunctionsMock( [ 'Z444' ] );

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
			errorType: Constants.ERROR_TYPES.WARNING,
			errorCode: Constants.ERROR_CODES.FUNCTION_OUTPUT_CHANGED
		};
		expect( store.setError ).toHaveBeenCalledWith( errorPayload );
	} );

	it( 'raises input + output function warnings if input and output have changed while editing and at least one test or implementation is connected', async () => {
		store.isCreateNewPage = false;
		store.getConnectedTests = createGettersWithFunctionsMock( [ 'Z222' ] );
		store.getConnectedImplementations = createGettersWithFunctionsMock( [] );

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
			errorType: Constants.ERROR_TYPES.WARNING,
			errorCode: Constants.ERROR_CODES.FUNCTION_INPUT_OUTPUT_CHANGED
		};
		expect( store.setError ).toHaveBeenCalledWith( errorPayload );
	} );

	it( 'does not raise function warnings if there are no connected tests and implementations', async () => {
		store.isCreateNewPage = false;
		store.getConnectedTests = createGettersWithFunctionsMock( [] );
		store.getConnectedImplementations = createGettersWithFunctionsMock( [] );

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

		expect( store.setError ).not.toHaveBeenCalled();
	} );

	it( 'does not raise function warnings if this is a new page', async () => {
		store.isCreateNewPage = true;

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

		expect( store.setError ).not.toHaveBeenCalled();
	} );

	it( 'calls the submitInteraction method when isFunctionDirty is set to true', async () => {
		store.isCreateNewPage = false;
		store.getConnectedTests = createGettersWithFunctionsMock( [] );
		store.getConnectedImplementations = createGettersWithFunctionsMock( [] );

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
