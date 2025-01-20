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
	ApiError = require( '../../../../../resources/ext.wikilambda.app/store/classes/ApiError.js' ),
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	PublishDialog = require( '../../../../../resources/ext.wikilambda.app/components/widgets/publish/PublishDialog.vue' ),
	useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

// Ignore all "teleport" behavior for the purpose of testing Dialog;
// see https://test-utils.vuejs.org/guide/advanced/teleport.html
config.global.stubs = {
	teleport: true
};

describe( 'Publish Dialog', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getErrors = createGettersWithFunctionsMock( [] );
		store.getCurrentZObjectId = 'Z0';
		store.getCurrentZObjectType = Constants.Z_FUNCTION;
		store.getCurrentZImplementationType = undefined;
		store.isCreateNewPage = true;
		store.getUserLangZid = 'Z1002';
		store.getUserLangCode = 'en';
		store.submitZObject.mockResolvedValue( { page: 'Z10001' } );
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
		store.getErrors = createGettersWithFunctionsMock( errors );

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
		expect( store.submitZObject ).toHaveBeenCalledWith( {
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
		store.submitZObject.mockRejectedValue( error );

		const wrapper = mount( PublishDialog, {
			props: { showDialog: true, functionSignatureChanged: false }
		} );

		wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
		await waitFor( () => expect( store.setError ).toHaveBeenCalledWith( {
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
		expect( store.submitZObject ).not.toHaveBeenCalled();
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
		expect( store.submitZObject ).toHaveBeenCalled();
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
		expect( store.submitZObject ).toHaveBeenCalled();
	} );

	describe( 'Event logging', () => {
		it( 'emits publish event after successful edit of an implementation', async () => {
			store.isCreateNewPage = false;
			store.getCurrentZObjectId = 'Z10001';
			store.getCurrentZObjectType = 'Z14';
			store.getCurrentZImplementationType = 'Z14K3';

			const wrapper = mount( PublishDialog, {
				props: { showDialog: true, functionSignatureChanged: false }
			} );

			wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );

			const streamName = 'mediawiki.product_metrics.wikifunctions_ui';
			const schemaID = '/analytics/mediawiki/product_metrics/wikilambda/ui_actions/1.0.0';
			const action = 'publish';
			const interactionData = { haserrors: false, implementationtype: 'Z14K3', zlang: 'Z1002', zobjectid: 'Z10001', zobjecttype: 'Z14' };

			await waitFor( () => expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith( streamName, schemaID, action, interactionData ) );
		} );

		it( 'emits publish event after unsuccessful creation of a function', async () => {
			const error = new ApiError( 'http', { error: { message: 'mock submission error' } } );

			store.submitZObject.mockRejectedValue( error );
			store.getErrors = createGettersWithFunctionsMock( [ { type: 'error', message: 'some error' } ] );
			store.isCreateNewPage = true;
			store.getCurrentZObjectId = 'Z0';
			store.getCurrentZObjectType = 'Z8';
			store.getCurrentZImplementationType = undefined;

			const wrapper = mount( PublishDialog, {
				props: { showDialog: true, functionSignatureChanged: false }
			} );

			wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );

			const streamName = 'mediawiki.product_metrics.wikifunctions_ui';
			const schemaID = '/analytics/mediawiki/product_metrics/wikilambda/ui_actions/1.0.0';
			const action = 'publish';
			const interactionData = { haserrors: true, zlang: 'Z1002', zobjectid: 'Z0', zobjecttype: 'Z8' };

			await waitFor( () => expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith( streamName, schemaID, action, interactionData ) );
		} );
	} );
} );
