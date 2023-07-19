/*!
 * WikiLambda unit test suite for the Publish Dialog.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	{ waitFor } = require( '@testing-library/vue' ),
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	PublishDialog = require( '../../../../resources/ext.wikilambda.edit/components/widgets/PublishDialog.vue' );

describe( 'Publish Dialog', () => {
	var getters,
		actions;

	beforeEach( () => {
		getters = {
			getErrors: createGettersWithFunctionsMock( [] ),
			getCurrentZObjectId: createGetterMock( 'Z0' ),
			getCurrentZObjectType: createGetterMock( Constants.Z_FUNCTION ),
			getCurrentZImplementationType: createGetterMock( undefined ),
			isNewZObject: createGetterMock( true ),
			getUserZlangZID: createGetterMock( 'Z1002' )
		};
		actions = {
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
		const wrapper = shallowMount( PublishDialog, {
			props: { showDialog: true },
			global: { stubs: { CdxDialog: false } }
		} );
		expect( wrapper.find( '.ext-wikilambda-publishdialog' ).exists() ).toBe( true );
	} );

	it( 'renders summary input field', () => {
		const wrapper = shallowMount( PublishDialog, {
			props: { showDialog: true },
			global: { stubs: { CdxDialog: false, CdxField: false } }
		} );
		expect( wrapper.find( '.ext-wikilambda-publishdialog__summary-input' ).exists() ).toBe( true );
	} );

	it( 'renders conditional legal text', () => {
		const wrapper = shallowMount( PublishDialog, {
			props: { showDialog: true },
			global: { stubs: { CdxDialog: false } }
		} );
		expect( wrapper.find( '.ext-wikilambda-publishdialog__legal-text' ).exists() ).toBe( true );
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

		const wrapper = shallowMount( PublishDialog, {
			props: { showDialog: true },
			global: { stubs: { CdxDialog: false, CdxMessage: false } }
		} );

		const messages = wrapper.findAllComponents( { name: 'cdx-message' } );
		expect( messages.length ).toBe( 2 );
		expect( messages[ 0 ].props( 'type' ) ).toBe( 'warning' );
		expect( messages[ 0 ].text() ).toBe( 'custom warning message' );
		expect( messages[ 1 ].props( 'type' ) ).toBe( 'error' );
		expect( messages[ 1 ].text() ).toBe( 'Some error happened while attempting to save your changes.' );
	} );

	it( 'closes the dialog when click cancel button', () => {
		const wrapper = shallowMount( PublishDialog, {
			props: { showDialog: true },
			global: { stubs: { CdxDialog: false, CdxButton: false } }
		} );

		wrapper.find( '.cdx-dialog__footer__default-action' ).trigger( 'click' );
		expect( wrapper.emitted( 'close-dialog' ) ).toBeTruthy();
	} );

	it( 'proceeds to publish when click publish button', () => {
		const wrapper = shallowMount( PublishDialog, {
			props: { showDialog: true, functionSignatureChanged: false },
			global: { stubs: { CdxDialog: false, CdxButton: false } }
		} );
		wrapper.vm.summary = 'mock summary';

		wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
		expect( actions.submitZObject ).toHaveBeenCalledWith( expect.anything(), {
			summary: 'mock summary',
			detachFunctionObjects: false
		} );
	} );

	it( 'closes dialog and navigates out when submission is successful', async () => {
		actions.submitZObject = jest.fn( () => Promise.resolve( 'Z10001' ) );
		global.store.hotUpdate( { actions: actions } );

		const wrapper = shallowMount( PublishDialog, {
			props: { showDialog: true, functionSignatureChanged: false },
			global: { stubs: { CdxDialog: false, CdxButton: false } }
		} );

		wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
		await waitFor( () => expect( wrapper.emitted( 'close-dialog' ) ).toBeTruthy() );
	} );

	it( 'shows error when submission is not successful', async () => {
		const error = {
			error: {
				message: 'mock submission error'
			}
		};
		actions.submitZObject = jest.fn( () => Promise.reject( error ) );
		global.store.hotUpdate( { actions: actions } );

		const wrapper = shallowMount( PublishDialog, {
			props: { showDialog: true, functionSignatureChanged: false },
			global: { stubs: { CdxDialog: false, CdxButton: false, CdxMessage: false } }
		} );

		wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
		await waitFor( () => expect( actions.setError ).toHaveBeenCalledWith( expect.anything(), {
			rowId: 0,
			errorType: Constants.errorTypes.ERROR,
			errorMessage: 'mock submission error'
		} ) );
	} );

	it( 'shows unknown error when submission is not successful', async () => {
		actions.submitZObject = jest.fn( () => Promise.reject( 'some unstructured error response' ) );
		global.store.hotUpdate( { actions: actions } );

		const wrapper = shallowMount( PublishDialog, {
			props: { showDialog: true, functionSignatureChanged: false },
			global: { stubs: { CdxDialog: false, CdxButton: false, CdxMessage: false } }
		} );

		wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
		await waitFor( () => expect( actions.setError ).toHaveBeenCalledWith( expect.anything(), {
			rowId: 0,
			errorType: Constants.errorTypes.ERROR,
			errorMessage: undefined,
			errorCode: Constants.errorCodes.UNKNOWN_ERROR
		} ) );
	} );

	describe( 'Event logging', () => {
		it( 'emits publish event after successful edit of an implementation', async () => {
			getters.isNewZObject = createGetterMock( false );
			getters.getCurrentZObjectId = createGetterMock( 'Z10001' );
			getters.getCurrentZObjectType = createGetterMock( 'Z14' );
			getters.getCurrentZImplementationType = createGetterMock( 'Z14K3' );
			actions.submitZObject = jest.fn( () => Promise.resolve( 'Z10001' ) );
			global.store.hotUpdate( {
				getters: getters,
				actions: actions
			} );

			const wrapper = shallowMount( PublishDialog, {
				props: { showDialog: true, functionSignatureChanged: false },
				global: { stubs: { CdxDialog: false, CdxButton: false } }
			} );

			wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );

			const eventName = 'wf.ui.editImplementation.publish';
			const eventData = {
				haserrors: false,
				implementationtype: 'Z14K3',
				isnewzobject: false,
				zlang: 'Z1002',
				zobjectid: 'Z10001',
				zobjecttype: 'Z14'
			};

			await waitFor( () => expect( mw.eventLog.dispatch ).toHaveBeenCalledWith( eventName, eventData ) );
		} );

		it( 'emits publish event after unsuccessful creation of a function', async () => {
			getters.getErrors = createGettersWithFunctionsMock( [ { type: 'error', message: 'some error' } ] );
			getters.isNewZObject = createGetterMock( true );
			getters.getCurrentZObjectId = createGetterMock( 'Z0' );
			getters.getCurrentZObjectType = createGetterMock( 'Z8' );
			getters.getCurrentZImplementationType = createGetterMock( undefined );
			actions.submitZObject = jest.fn( () => Promise.reject( 'some error' ) );
			global.store.hotUpdate( {
				getters: getters,
				actions: actions
			} );

			const wrapper = shallowMount( PublishDialog, {
				props: { showDialog: true, functionSignatureChanged: false },
				global: { stubs: { CdxDialog: false, CdxButton: false } }
			} );

			wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );

			const eventName = 'wf.ui.editFunction.publish';
			const eventData = {
				haserrors: true,
				implementationtype: null,
				isnewzobject: true,
				zlang: 'Z1002',
				zobjectid: 'Z0',
				zobjecttype: 'Z8'
			};

			await waitFor( () => expect( mw.eventLog.dispatch ).toHaveBeenCalledWith( eventName, eventData ) );
		} );
	} );
} );
