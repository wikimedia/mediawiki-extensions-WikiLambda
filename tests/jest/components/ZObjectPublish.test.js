/*!
 * WikiLambda unit test suite for the z object publish component.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const configureCompat = require( 'vue' ).configureCompat,
	mount = require( '@vue/test-utils' ).mount,
	shallowMount = require( '@vue/test-utils' ).shallowMount,
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	PublishDialog = require( '../../../resources/ext.wikilambda.edit/components/editor/PublishDialog.vue' ),
	ZObjectPublish = require( '../../../resources/ext.wikilambda.edit/components/ZObjectPublish.vue' ),
	{ CdxTextInput } = require( '@wikimedia/codex' );

configureCompat( { MODE: 3 } );

describe( 'ZObjectPublish', function () {
	var getters,
		actions,
		submitZObjectMock = jest.fn();
	beforeEach( function () {
		// Needed because of the Teleported component.
		const el = document.createElement( 'div' );
		el.id = 'ext-wikilambda-app';
		document.body.appendChild( el );

		getters = {
			getErrors: jest.fn( function () {
				return {};
			} ),
			getCurrentZObjectId: jest.fn( function () {
				return 0;
			} ),
			getCurrentZObjectType: jest.fn( function () {
				return Constants.Z_FUNCTION;
			} )
		};

		actions = {
			submitZObject: submitZObjectMock,
			validateZObject: jest.fn( function () {
				return true;
			} ),
			setError: jest.fn()
		};

		global.store.hotUpdate( { getters: getters, actions: actions } );
	} );

	afterEach( () => {
		document.body.outerHTML = '';
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZObjectPublish );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'opens the publish dialog if validateZObject returns isValid true', async function () {
		var wrapper = mount( ZObjectPublish );
		await wrapper.find( '.ext-wikilambda-publish-zobject__publish-button' ).trigger( 'click' );

		const publishDialog = wrapper.findComponent( PublishDialog );

		expect( publishDialog.vm.showDialog ).toBe( true );
		const publishButton = wrapper.findComponent( '.cdx-dialog__footer__primary-action' );
		expect( publishButton.exists() ).toBeTruthy();
	} );

	it( 'does not open the publish dialog if validateZObject returns isValid false', async function () {
		actions.validateZObject = jest.fn( function () {
			return false;
		} );

		global.store.hotUpdate( {
			actions: actions
		} );

		var wrapper = mount( ZObjectPublish );
		await wrapper.find( '.ext-wikilambda-publish-zobject__publish-button' ).trigger( 'click' );

		const publishDialog = wrapper.findComponent( PublishDialog );
		expect( publishDialog.vm.showDialog ).toBe( false );
		const publishButton = wrapper.findComponent( '.cdx-dialog__footer__primary-action' );
		expect( publishButton.exists() ).toBeFalsy();
	} );

	it( 'publish dialog triggers the "publish" event on button click and submits the input summary', async function () {
		var wrapper = mount( ZObjectPublish );

		// ACT: open dialog
		await wrapper.find( '.ext-wikilambda-publish-zobject__publish-button' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		// ACT: enter summary
		wrapper.getComponent( CdxTextInput ).get( 'input' ).setValue( 'my changes summary' );

		const publishButton = wrapper.findComponent( '.cdx-dialog__footer__primary-action' );
		expect( publishButton.exists() ).toBeTruthy();

		wrapper.vm.$nextTick( function () {
			// ACT: click publish button.
			publishButton.trigger( 'click' );
			expect( submitZObjectMock ).toHaveBeenCalledWith( expect.anything(), { shouldUnattachImplementationAndTester: false, summary: 'my changes summary' } );
		} );
	} );

	it( 'publish dialog triggers the "close dialog" event on cancel button click', async function () {
		var wrapper = mount( ZObjectPublish );

		// ACT: open dialog
		await wrapper.find( '.ext-wikilambda-publish-zobject__publish-button' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		const cancelButton = wrapper.findComponent( '.cdx-dialog__footer__default-action' );
		expect( cancelButton.exists() ).toBeTruthy();

		wrapper.vm.$nextTick( function () {
			// ACT: click cancel button.
			cancelButton.trigger( 'click' );

			const publishDialog = wrapper.findComponent( PublishDialog );
			expect( publishDialog.emitted() ).toHaveProperty( 'close-dialog' );
		} );
	} );

	it( 'displays received errors in the dialog box', async function () {
		getters.getErrors = jest.fn( function () {
			return { 0: {
				state: true,
				message: 'error to be displayed',
				type: Constants.errorTypes.ERROR
			} };
		} );

		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = mount( ZObjectPublish );

		// ACT: open dialog
		await wrapper.find( '.ext-wikilambda-publish-zobject__publish-button' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		const dialog = wrapper.findComponent( { name: 'cdx-dialog' } );

		const errors = dialog.find( '.ext-wikilambda-publishdialog__errors' );
		expect( errors.exists() ).toBeTruthy();

		const errorMessage = dialog.find( '.ext-wikilambda-publishdialog__errors__message' );
		expect( errorMessage.text() ).toBe( 'error to be displayed' );

		const warnings = dialog.findComponent( '.ext-wikilambda-publishdialog__warnings' );
		expect( warnings.exists() ).toBeFalsy();
	} );

	it( 'displays warnings in the dialog box', async function () {
		getters.getErrors = jest.fn( function () {
			return { 0: {
				state: true,
				message: 'warning to be displayed',
				type: Constants.errorTypes.WARNING
			} };
		} );

		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = mount( ZObjectPublish );

		// ACT: open dialog
		await wrapper.find( '.ext-wikilambda-publish-zobject__publish-button' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		const dialog = wrapper.findComponent( { name: 'cdx-dialog' } );

		const warnings = dialog.find( '.ext-wikilambda-publishdialog__warnings' );
		expect( warnings.exists() ).toBeTruthy();

		const warningMessage = dialog.find( '.ext-wikilambda-publishdialog__warnings__message' );
		expect( warningMessage.text() ).toBe( 'warning to be displayed' );

		const errors = dialog.find( '.ext-wikilambda-publishdialog__errors' );
		expect( errors.exists() ).toBeFalsy();
	} );

	it( 'sets errors returned from the API to the store', async function () {
		const mockErrorFromApi = { error: { message: 'error message from the  api' } };
		const mockSetError = jest.fn();
		actions.setError = mockSetError;
		actions.submitZObject = jest.fn().mockRejectedValue( mockErrorFromApi );

		global.store.hotUpdate( {
			actions: actions
		} );

		var wrapper = mount( ZObjectPublish );

		// ACT: open dialog
		await wrapper.find( '.ext-wikilambda-publish-zobject__publish-button' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		const publishButton = wrapper.findComponent( '.cdx-dialog__footer__primary-action' );

		// ACT: click publish button
		await publishButton.trigger( 'click' );
		await wrapper.vm.$nextTick();

		expect( mockSetError ).toHaveBeenCalledWith( expect.anything(), { errorMessage: 'error message from the  api', errorState: true, errorType: Constants.errorTypes.ERROR, internalId: 0 } );
	} );
} );
