/*!
 * WikiLambda unit test suite for the leaver editor dialog component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { config, mount } = require( '@vue/test-utils' );

const LeaveEditorDialog = require( '../../../../../resources/ext.wikilambda.app/components/widgets/publish/LeaveEditorDialog.vue' );

// Ignore all "teleport" behavior for the purpose of testing Dialog;
// see https://test-utils.vuejs.org/guide/advanced/teleport.html
config.global.stubs = {
	teleport: true
};

describe( 'LeaveEditorDialog', () => {
	it( 'renders without errors', () => {
		const wrapper = mount( LeaveEditorDialog, {
			props: {
				showDialog: false
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-leave-editor-dialog' ).exists() ).toBe( true );
	} );

	it( 'runs the given continue callback on "discard edits" button click', () => {
		const mockCallback = jest.fn();
		const wrapper = mount( LeaveEditorDialog, {
			props: {
				continueCallback: mockCallback,
				showDialog: true
			}
		} );

		wrapper.findComponent( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
		expect( mockCallback ).toHaveBeenCalled();
	} );

	it( 'triggers the "close dialog" event on "continue editing" button click', async () => {
		const wrapper = mount( LeaveEditorDialog, {
			props: {
				showDialog: true
			}
		} );

		wrapper.findComponent( '.cdx-dialog__footer__default-action' ).trigger( 'click' );
		expect( wrapper.emitted() ).toHaveProperty( 'close-dialog' );
	} );
} );
