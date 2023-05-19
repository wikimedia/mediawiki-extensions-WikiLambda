/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	FunctionEditorFooter = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorFooter.vue' );

describe( 'FunctionEditorFooter', function () {
	beforeEach( () => {
		var getters = {
			getErrors: jest.fn( function () {
				return {};
			} )
		};
		global.store.hotUpdate( {
			getters: getters
		} );

	} );
	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionEditorFooter );

		expect( wrapper.find( '.ext-wikilambda-function-definition-footer' ).exists() ).toBeTruthy();
	} );

	it( 'displays the PublishWidget component', function () {
		var wrapper = VueTestUtils.mount( FunctionEditorFooter );

		expect( wrapper.find( '.ext-wikilambda-publish-widget' ).exists() ).toBeTruthy();
	} );

	it( 'triggers the "cancel" event on cancel button click', function () {
		var wrapper = VueTestUtils.mount( FunctionEditorFooter, {
			props: {
				isEditing: true
			},
			global: {
				stubs: { CdxButton: false }
			}
		} );

		const cancelButton = wrapper.find( '.ext-wikilambda-publish-widget__cancel-button' );
		expect( cancelButton.exists() ).toBeTruthy();
		return cancelButton.trigger( 'click' ).then( function () {
			expect( wrapper.emitted().cancel ).toBeTruthy();
		} );
	} );
} );
