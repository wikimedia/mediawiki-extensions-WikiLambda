/*!
 * WikiLambda unit test suite for the Publish Dialog.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { config, mount } = require( '@vue/test-utils' ),
	{ waitFor } = require( '@testing-library/vue' ),
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../../helpers/getterHelpers.js' ).createGetterMock,
	ApiError = require( '../../../../../resources/ext.wikilambda.app/store/classes/ApiError.js' ),
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	PublishDialog = require( '../../../../../resources/ext.wikilambda.app/components/widgets/publish/PublishDialog.vue' );

// Ignore all "teleport" behavior for the purpose of testing Dialog;
// see https://test-utils.vuejs.org/guide/advanced/teleport.html
config.global.stubs = {
	teleport: true
};

describe( 'Publish Dialog', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			getErrors: createGettersWithFunctionsMock( [] ),
			getCurrentZObjectId: createGetterMock( 'Z0' ),
			getCurrentZObjectType: createGetterMock( Constants.Z_FUNCTION ),
			getCurrentZImplementationType: createGetterMock( undefined ),
			isCreateNewPage: createGetterMock( true ),
			getUserLangZid: createGetterMock( 'Z1002' ),
			getUserLangCode: createGetterMock( 'en' )
		};
		actions = {
			submitZObject: jest.fn().mockReturnValue( { page: 'Z10001' } ),
			setError: jest.fn(),
			setDirty: jest.fn(),
			clearAllErrors: jest.fn()
		};
		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	const triggerKeydown = async ( input, key, keyCode, modifierKey ) => {
		await input.trigger( 'keydown', {
			key: key,
			keyCode: keyCode,
			code: key,
			...modifierKey ? { [ modifierKey ]: true } : {}
		} );
	};

	it( 'renders without errors', () => {
		const wrapper = mount( PublishDialog, {
			props: { showDialog: true }
		} );
		expect( wrapper.find( '.ext-wikilambda-app-publish-dialog' ).exists() ).toBe( true );
	} );

	it( 'renders summary input field', () => {
		const wrapper = mount( PublishDialog, {
			props: { showDialog: true }
		} );
		expect( wrapper.find( '.ext-wikilambda-app-publish-dialog__summary-input' ).exists() ).toBe( true );
	} );

	it( 'renders conditional legal text', () => {
		const wrapper = mount( PublishDialog, {
			props: { showDialog: true }
		} );
		expect( wrapper.find( '.ext-wikilambda-app-publish-dialog__legal-text' ).exists() ).toBe( true );
	} );

	it( 'renders page errors and warnings', () => {
		const errors = [ {
			message: 'custom warning message',
			code: undefined,
			type: Constants.errorTypes.WARNING
		}, {
			message: undefined,
			code: Constants.errorCodes.UNKNOWN_ERROR,
			type: Constants.errorTypes.ERROR
		} ];
		getters.getErrors = createGettersWithFunctionsMock( errors );
		global.store.hotUpdate( { getters: getters } );

		const wrapper = mount( PublishDialog, {
			props: { showDialog: true }
		} );

		const messages = wrapper.findAllComponents( { name: 'cdx-message' } );
		expect( messages.length ).toBe( 2 );
		expect( messages[ 0 ].props( 'type' ) ).toBe( 'warning' );
		expect( messages[ 0 ].text() ).toBe( 'custom warning message' );
		expect( messages[ 1 ].props( 'type' ) ).toBe( 'error' );
		expect( messages[ 1 ].text() ).toBe( 'Unable to complete request. Please try again.' );
	} );

	it( 'closes the dialog when click cancel button', () => {
		const wrapper = mount( PublishDialog, {
			props: { showDialog: true }
		} );

		wrapper.find( '.cdx-dialog__footer__default-action' ).trigger( 'click' );
		expect( wrapper.emitted( 'close-dialog' ) ).toBeTruthy();
	} );

	it( 'proceeds to publish when click publish button', () => {
		const wrapper = mount( PublishDialog, {
			props: { showDialog: true, functionSignatureChanged: false }
		} );
		wrapper.vm.summary = 'mock summary';

		wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
		expect( actions.submitZObject ).toHaveBeenCalledWith( expect.anything(), {
			summary: 'mock summary',
			disconnectFunctionObjects: false
		} );
	} );

	it( 'closes dialog and navigates out when submission is successful', async () => {
		const wrapper = mount( PublishDialog, {
			props: { showDialog: true, functionSignatureChanged: false }
		} );

		wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
		await waitFor( () => expect( wrapper.emitted( 'close-dialog' ) ).toBeTruthy() );
	} );

	it( 'shows error when submission is not successful', async () => {
		const error = new ApiError( 'http', { error: { message: 'mock submission error' } } );
		actions.submitZObject = jest.fn().mockRejectedValue( error );
		global.store.hotUpdate( { actions: actions } );

		const wrapper = mount( PublishDialog, {
			props: { showDialog: true, functionSignatureChanged: false }
		} );

		wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
		await waitFor( () => expect( actions.setError ).toHaveBeenCalledWith( expect.anything(), {
			rowId: 0,
			errorType: Constants.errorTypes.ERROR,
			errorMessage: 'mock submission error'
		} ) );
	} );

	it( 'shows a keyboard warning when trying to submit with the Enter key', async () => {
		const wrapper = mount( PublishDialog, {
			props: { showDialog: true, functionSignatureChanged: false }
		} );

		wrapper.vm.summary = 'mock summary';

		// Find the input element
		const input = wrapper.find( '.ext-wikilambda-app-publish-dialog__summary-input input' );

		// Simulate hitting Enter on the input element
		await triggerKeydown( input, 'Enter', 13 );

		await waitFor( () => expect( wrapper.find( '.cdx-message--warning.ext-wikilambda-app-publish-dialog__keyboard-submit-warning' ).exists() ).toBe( true ) );
		expect( actions.submitZObject ).not.toHaveBeenCalled();
	} );

	it( 'proceeds to publish when pressing Ctrl + Enter on Windows', async () => {

		const wrapper = mount( PublishDialog, {
			props: { showDialog: true, functionSignatureChanged: false }
		} );

		// Find the input element
		const input = wrapper.find( '.ext-wikilambda-app-publish-dialog__summary-input input' );

		// Simulate hitting Ctrl + Enter on the input element
		await triggerKeydown( input, 'Enter', 13, 'ctrlKey' );

		await waitFor( () => expect( wrapper.find( '.cdx-message--warning.ext-wikilambda-app-publish-dialog__keyboard-submit-warning' ).exists() ).toBe( false ) );
		expect( actions.submitZObject ).toHaveBeenCalled();
	} );

	it( 'proceeds to publish when pressing CMD + Enter on Mac', async () => {

		const wrapper = mount( PublishDialog, {
			props: { showDialog: true, functionSignatureChanged: false }
		} );

		// Find the input element
		const input = wrapper.find( '.ext-wikilambda-app-publish-dialog__summary-input input' );

		// Simulate hitting Cmd + Enter on the input element
		await triggerKeydown( input, 'Enter', 13, 'metaKey' );

		await waitFor( () => expect( wrapper.find( '.cdx-message--warning.ext-wikilambda-app-publish-dialog__keyboard-submit-warning' ).exists() ).toBe( false ) );
		expect( actions.submitZObject ).toHaveBeenCalled();
	} );

	describe( 'Event logging', () => {
		it( 'emits publish event after successful edit of an implementation', async () => {
			getters.isCreateNewPage = createGetterMock( false );
			getters.getCurrentZObjectId = createGetterMock( 'Z10001' );
			getters.getCurrentZObjectType = createGetterMock( 'Z14' );
			getters.getCurrentZImplementationType = createGetterMock( 'Z14K3' );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = mount( PublishDialog, {
				props: { showDialog: true, functionSignatureChanged: false }
			} );

			wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );

			const streamName = 'mediawiki.product_metrics.wikifunctions_ui';
			const schemaID = '/analytics/mediawiki/product_metrics/wikilambda/ui_actions/1.0.0';
			const action = 'publish';
			const interactionData = { haserrors: false, zlang: 'Z1002', zobjectid: 'Z0', zobjecttype: 'Z8' };

			await waitFor( () => expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith( streamName, schemaID, action, interactionData ) );
		} );

		it( 'emits publish event after unsuccessful creation of a function', async () => {
			const error = new ApiError( 'http', { error: { message: 'mock submission error' } } );
			actions.submitZObject = jest.fn().mockRejectedValue( error );
			getters.getErrors = createGettersWithFunctionsMock( [ { type: 'error', message: 'some error' } ] );
			getters.isCreateNewPage = createGetterMock( true );
			getters.getCurrentZObjectId = createGetterMock( 'Z0' );
			getters.getCurrentZObjectType = createGetterMock( 'Z8' );
			getters.getCurrentZImplementationType = createGetterMock( undefined );
			global.store.hotUpdate( {
				getters: getters,
				actions: actions
			} );

			const wrapper = mount( PublishDialog, {
				props: { showDialog: true, functionSignatureChanged: false }
			} );

			wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );

			const streamName = 'mediawiki.product_metrics.wikifunctions_ui';
			const schemaID = '/analytics/mediawiki/product_metrics/wikilambda/ui_actions/1.0.0';
			const action = 'publish';
			const interactionData = { haserrors: false, zlang: 'Z1002', zobjectid: 'Z0', zobjecttype: 'Z8' };

			await waitFor( () => expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith( streamName, schemaID, action, interactionData ) );
		} );
	} );
} );
