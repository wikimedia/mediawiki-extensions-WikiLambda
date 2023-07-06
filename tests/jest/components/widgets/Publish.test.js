/*!
 * WikiLambda unit test suite for the z object publish component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const configureCompat = require( 'vue' ).configureCompat,
	mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	PublishDialog = require( '../../../../resources/ext.wikilambda.edit/components/widgets/PublishDialog.vue' ),
	PublishWidget = require( '../../../../resources/ext.wikilambda.edit/components/widgets/Publish.vue' ),
	{ CdxTextInput } = require( '@wikimedia/codex' );

configureCompat( { MODE: 3 } );

describe( 'Publish widget', function () {
	var getters,
		actions;

	beforeEach( function () {
		// Needed because of the Teleported component.
		const el = document.createElement( 'div' );
		el.id = 'ext-wikilambda-app';
		document.body.appendChild( el );

		getters = {
			getErrors: createGettersWithFunctionsMock( [] ),
			getCurrentZObjectId: createGettersWithFunctionsMock( 0 ),
			getCurrentZObjectType: createGettersWithFunctionsMock( Constants.Z_FUNCTION ),
			isNewZObject: createGettersWithFunctionsMock( true ),
			getUserZlangZID: createGettersWithFunctionsMock( 'Z1002' )
		};
		actions = {
			submitZObject: jest.fn(),
			validateZObject: jest.fn( () => true ),
			setError: jest.fn(),
			clearValidationErrors: jest.fn(),
			clearAllErrors: jest.fn()
		};
		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	afterEach( () => {
		document.body.outerHTML = '';
	} );

	it( 'renders without errors', function () {
		var wrapper = mount( PublishWidget );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'opens the publish dialog if validateZObject returns isValid true', async function () {
		var wrapper = mount( PublishWidget );
		await wrapper.find( '.ext-wikilambda-publish-widget__publish-button' ).trigger( 'click' );

		const publishDialog = wrapper.findComponent( PublishDialog );

		expect( publishDialog.vm.showDialog ).toBe( true );
		const publishButton = wrapper.findComponent( '.ext-wikilambda-publishdialog__actions__button-publish' );
		expect( publishButton.exists() ).toBeTruthy();
	} );

	it( 'does not open the publish dialog if validateZObject returns isValid false', async function () {
		actions.validateZObject = jest.fn( function () {
			return false;
		} );

		global.store.hotUpdate( {
			actions: actions
		} );

		var wrapper = mount( PublishWidget );
		await wrapper.find( '.ext-wikilambda-publish-widget__publish-button' ).trigger( 'click' );

		const publishDialog = wrapper.findComponent( PublishDialog );
		expect( publishDialog.vm.showDialog ).toBe( false );
		const publishButton = wrapper.findComponent( '.ext-wikilambda-publishdialog__actions__button-publish' );
		expect( publishButton.exists() ).toBeFalsy();
	} );

	it( 'publish dialog triggers the "publish" event on button click and submits the input summary', async function () {
		var wrapper = mount( PublishWidget );

		// ACT: open dialog
		await wrapper.find( '.ext-wikilambda-publish-widget__publish-button' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		// ACT: enter summary
		wrapper.getComponent( CdxTextInput ).get( 'input' ).setValue( 'my changes summary' );

		const publishButton = wrapper.findComponent( '.ext-wikilambda-publishdialog__actions__button-publish' );
		expect( publishButton.exists() ).toBeTruthy();

		wrapper.vm.$nextTick( function () {
			// ACT: click publish button.
			publishButton.trigger( 'click' );
			expect( actions.submitZObject ).toHaveBeenCalledWith( expect.anything(), {
				shouldUnattachImplementationAndTester: false,
				summary: 'my changes summary' } );
		} );
	} );

	it( 'publish dialog triggers the "close dialog" event on cancel button click', async function () {
		var wrapper = mount( PublishWidget );

		// ACT: open dialog
		await wrapper.find( '.ext-wikilambda-publish-widget__publish-button' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		const cancelButton = wrapper.findComponent( '.ext-wikilambda-publishdialog__actions__button-cancel' );
		expect( cancelButton.exists() ).toBeTruthy();

		wrapper.vm.$nextTick( function () {
			// ACT: click cancel button.
			cancelButton.trigger( 'click' );

			const publishDialog = wrapper.findComponent( PublishDialog );
			expect( publishDialog.emitted() ).toHaveProperty( 'close-dialog' );
		} );
	} );

	it( 'displays received errors in the dialog box', async function () {
		getters.getErrors = createGettersWithFunctionsMock( [ {
			code: undefined,
			message: 'error to be displayed',
			type: Constants.errorTypes.ERROR
		} ] );
		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = mount( PublishWidget );

		// ACT: open dialog
		await wrapper.find( '.ext-wikilambda-publish-widget__publish-button' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		const dialog = wrapper.findComponent( { name: 'cdx-dialog' } );

		const errors = dialog.find( '.ext-wikilambda-publishdialog__errors' );
		expect( errors.exists() ).toBeTruthy();

		const errorMessages = errors.findAllComponents( { name: 'cdx-message' } );
		expect( errorMessages.length ).toBe( 1 );

		const errorMessage = errorMessages[ 0 ];
		expect( errorMessage.text() ).toBe( 'error to be displayed' );
		expect( errorMessage.props( 'type' ) ).toBe( Constants.errorTypes.ERROR );
	} );

	it( 'displays warnings in the dialog box', async function () {
		getters.getErrors = createGettersWithFunctionsMock( [ {
			code: Constants.errorCodes.TYPED_LIST_TYPE_CHANGED,
			message: undefined,
			type: Constants.errorTypes.WARNING
		}, {
			code: undefined,
			message: 'custom warning message',
			type: Constants.errorTypes.WARNING
		} ] );
		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = mount( PublishWidget );

		// ACT: open dialog
		await wrapper.find( '.ext-wikilambda-publish-widget__publish-button' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		const dialog = wrapper.findComponent( { name: 'cdx-dialog' } );

		const warnings = dialog.find( '.ext-wikilambda-publishdialog__errors' );
		expect( warnings.exists() ).toBeTruthy();

		const warningMessages = warnings.findAllComponents( { name: 'cdx-message' } );
		expect( warningMessages.length ).toBe( 2 );

		const firstWarning = warningMessages[ 0 ];
		expect( firstWarning.props( 'type' ) ).toBe( Constants.errorTypes.WARNING );
		expect( firstWarning.text() ).toBe(
			'You changed the type of one or more lists. On publish, all list items will be deleted' );

		const secondWarning = warningMessages[ 1 ];
		expect( secondWarning.props( 'type' ) ).toBe( Constants.errorTypes.WARNING );
		expect( secondWarning.text() ).toBe( 'custom warning message' );
	} );

	it( 'sets errors returned from the API to the store', async function () {
		const mockErrorFromApi = { error: { message: 'error message from the api' } };
		const mockSetError = jest.fn();
		actions.setError = mockSetError;
		actions.submitZObject = jest.fn().mockRejectedValue( mockErrorFromApi );

		global.store.hotUpdate( {
			actions: actions
		} );

		var wrapper = mount( PublishWidget );

		// ACT: open dialog
		await wrapper.find( '.ext-wikilambda-publish-widget__publish-button' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		const publishButton = wrapper.findComponent( '.ext-wikilambda-publishdialog__actions__button-publish' );

		// ACT: click publish button
		await publishButton.trigger( 'click' );
		await wrapper.vm.$nextTick();

		expect( mockSetError ).toHaveBeenCalledWith( expect.anything(), {
			rowId: 0,
			errorMessage: 'error message from the api',
			errorType: Constants.errorTypes.ERROR
		} );
	} );
} );
