/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGetterMock = require( '../../../helpers/getterHelpers.js' ).createGetterMock,
	Constants = require( '../../../../../resources/ext.wikilambda.edit/Constants.js' ),
	FunctionEditorFooter = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorFooter.vue' );

describe( 'FunctionEditorFooter', function () {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
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
		expect( wrapper.find( '.ext-wikilambda-function-definition-footer' ).exists() ).toBeTruthy();
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
		expect( wrapper.find( '.ext-wikilambda-publish-widget' ).exists() ).toBeTruthy();
	} );

	it( 'raises function warnings if input or output have changed while editing', async () => {
		getters.isCreateNewPage = createGetterMock( false );
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
} );
