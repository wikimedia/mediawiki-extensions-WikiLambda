/*!
 * WikiLambda unit test suite for the leaver editor dialog component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	LeaveEditorDialog = require( '../../../../resources/ext.wikilambda.edit/components/widgets/LeaveEditorDialog.vue' );

describe( 'LeaveEditorDialog', () => {
	it( 'renders without errors', () => {
		const wrapper = shallowMount( LeaveEditorDialog );
		expect( wrapper.find( '.ext-wikilambda-leaveeditordialog' ).exists() ).toBe( true );
	} );

	it( 'runs the given continue callback on "discard edits" button click', () => {
		const mockCallback = jest.fn();
		const wrapper = shallowMount( LeaveEditorDialog, {
			props: { continueCallback: mockCallback, showDialog: true },
			global: { stubs: { CdxDialog: false, CdxButton: false } }
		} );

		wrapper.findComponent( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
		expect( mockCallback ).toHaveBeenCalled();
	} );

	it( 'triggers the "close dialog" event on "continue editing" button click', async () => {
		const wrapper = shallowMount( LeaveEditorDialog, {
			props: { showDialog: true },
			global: { stubs: { CdxDialog: false, CdxButton: false } }
		} );

		wrapper.findComponent( '.cdx-dialog__footer__default-action' ).trigger( 'click' );
		expect( wrapper.emitted() ).toHaveProperty( 'close-dialog' );
	} );
} );
