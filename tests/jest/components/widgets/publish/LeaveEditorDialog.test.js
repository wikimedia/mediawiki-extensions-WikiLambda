/*!
 * WikiLambda unit test suite for the leaver editor dialog component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );
const { dialogGlobalStubs } = require( '../../../helpers/dialogTestHelpers.js' );

const LeaveEditorDialog = require( '../../../../../resources/ext.wikilambda.app/components/widgets/publish/LeaveEditorDialog.vue' );

describe( 'LeaveEditorDialog', () => {
	function renderLeaveEditorDialog( props = {}, options = {} ) {
		const defaultProps = {
			showDialog: true
		};
		const defaultOptions = {
			global: {
				stubs: {
					...dialogGlobalStubs,
					...options?.stubs
				}
			}
		};
		return mount( LeaveEditorDialog, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	}

	it( 'renders without errors', () => {
		const wrapper = renderLeaveEditorDialog();
		expect( wrapper.find( '.ext-wikilambda-app-leave-editor-dialog' ).exists() ).toBe( true );
	} );

	it( 'runs the given continue callback on "discard edits" button click', () => {
		const mockCallback = jest.fn();
		const wrapper = renderLeaveEditorDialog( { continueCallback: mockCallback } );

		wrapper.get( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
		expect( mockCallback ).toHaveBeenCalled();
	} );

	it( 'triggers the "close dialog" event on "continue editing" button click', async () => {
		const wrapper = renderLeaveEditorDialog();

		wrapper.get( '.cdx-dialog__footer__default-action' ).trigger( 'click' );
		expect( wrapper.emitted() ).toHaveProperty( 'close-dialog' );
	} );
} );
