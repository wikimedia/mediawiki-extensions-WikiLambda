/*!
 * WikiLambda unit test suite for the z object publish component.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const mount = require( '@vue/test-utils' ).mount,
	shallowMount = require( '@vue/test-utils' ).shallowMount,
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	PublishDialog = require( '../../../resources/ext.wikilambda.edit/components/editor/PublishDialog.vue' ),
	ZObjectPublish = require( '../../../resources/ext.wikilambda.edit/components/ZObjectPublish.vue' ),
	{ CdxTextInput } = require( '@wikimedia/codex' );

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
			getCurrentZObjectId: jest.fn(),
			getCurrentZObjectType: jest.fn( function () {
				return Constants.Z_FUNCTION;
			} )
		};

		actions = {
			submitZObject: submitZObjectMock,
			validateZObject: jest.fn( function () {
				return { isValid: true };
			} )
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
		await wrapper.find( '.ext-wikilamba-publish-zobject__publish-button' ).trigger( 'click' );

		const publishDialog = wrapper.findComponent( PublishDialog );

		expect( publishDialog.vm.showDialog ).toBe( true );
		const publishButton = wrapper.findComponent( '#primary-button' );
		expect( publishButton.exists() ).toBeTruthy();
	} );

	it( 'does not open the publish dialog if validateZObject returns isValid false', async function () {
		actions.validateZObject = jest.fn( function () {
			return { isValid: false };
		} );

		global.store.hotUpdate( {
			actions: actions
		} );

		var wrapper = mount( ZObjectPublish );
		await wrapper.find( '.ext-wikilamba-publish-zobject__publish-button' ).trigger( 'click' );

		const publishDialog = wrapper.findComponent( PublishDialog );
		expect( publishDialog.vm.showDialog ).toBe( false );
		const publishButton = wrapper.findComponent( '#primary-button' );
		expect( publishButton.exists() ).toBeFalsy();
	} );

	it( 'publish dialog triggers the "publish" event on button click and submits the input summary', async function () {
		var wrapper = mount( ZObjectPublish );

		// ACT: open dialog
		await wrapper.find( '.ext-wikilamba-publish-zobject__publish-button' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		// ACT: enter summary
		wrapper.getComponent( CdxTextInput ).vm.$emit( 'input', 'my changes summary' );

		const publishButton = wrapper.findComponent( '#primary-button' );
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
		await wrapper.find( '.ext-wikilamba-publish-zobject__publish-button' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		const cancelButton = wrapper.findComponent( '#cancel-button' );
		expect( cancelButton.exists() ).toBeTruthy();

		wrapper.vm.$nextTick( function () {
			// ACT: click cancel button.
			cancelButton.trigger( 'click' );

			const publishDialog = wrapper.findComponent( PublishDialog );
			expect( publishDialog.emitted() ).toHaveProperty( 'close-dialog' );
		} );
	} );
} );
