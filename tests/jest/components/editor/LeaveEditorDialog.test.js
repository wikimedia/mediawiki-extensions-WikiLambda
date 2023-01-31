/*!
 * WikiLambda unit test suite for the leaver editor dialog component.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var mount = require( '@vue/test-utils' ).mount,
	shallowMount = require( '@vue/test-utils' ).shallowMount,
	LeaveEditorDialog = require( '../../../../resources/ext.wikilambda.edit/components/base/LeaveEditorDialog.vue' );

describe( 'LeaveEditorDialog', function () {
	beforeEach( function () {
		// Needed because of the Teleported component.
		const el = document.createElement( 'div' );
		el.id = 'ext-wikilambda-app';
		document.body.appendChild( el );
	} );

	afterEach( () => {
		document.body.outerHTML = '';
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( LeaveEditorDialog );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'runs the given continue callback on "discard edits" button click', async function () {
		const mockContinueCallback = jest.fn();
		var wrapper = mount( LeaveEditorDialog, {
			props: {
				continueCallback: mockContinueCallback,
				showDialog: false
			}
		} );
		await wrapper.setProps( { showDialog: true } );
		const discardEditsButton = wrapper.findComponent( '.cdx-dialog__footer__primary-action' );

		wrapper.vm.$nextTick( function () {
			// ACT: click discard edits and continue button.
			discardEditsButton.trigger( 'click' );

			expect( mockContinueCallback ).toHaveBeenCalled();
		} );
	} );

	it( 'triggers the "close dialog" event on "continue editing" button click', async function () {
		var wrapper = mount( LeaveEditorDialog, {
			props: {
				continueCallback: jest.fn(),
				showDialog: false
			}
		} );

		await wrapper.setProps( { showDialog: true } );
		const continueEditingButton = wrapper.findComponent( '.cdx-dialog__footer__default-action' );

		wrapper.vm.$nextTick( function () {
			// ACT: click continue editing button.
			continueEditingButton.trigger( 'click' );

			expect( wrapper.emitted() ).toHaveProperty( 'close-dialog' );
		} );
	} );
} );
