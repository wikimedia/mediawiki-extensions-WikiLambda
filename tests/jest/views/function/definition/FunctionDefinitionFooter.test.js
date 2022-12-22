/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	FunctionDefinitionFooter = require( '../../../../../resources/ext.wikilambda.edit/components/function/definition/FunctionDefinitionFooter.vue' );

describe( 'FunctionDefinitionFooter', function () {
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
		var wrapper = VueTestUtils.shallowMount( FunctionDefinitionFooter );

		expect( wrapper.find( '.ext-wikilambda-function-definition-footer' ).exists() ).toBeTruthy();
	} );

	it( 'displays the ZObjectPublish component', function () {
		var wrapper = VueTestUtils.mount( FunctionDefinitionFooter );

		expect( wrapper.find( '.ext-wikilambda-publish-zobject' ).exists() ).toBeTruthy();
	} );

	it( 'triggers the "cancel" event on cancel button click', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionDefinitionFooter, {
			props: {
				isEditing: true
			},
			global: {
				stubs: { CdxButton: false }
			}
		} );

		const cancelButton = wrapper.find( '#ext-wikilambda-function-definition-footer__actions__cancel' );
		expect( cancelButton.exists() ).toBeTruthy();
		return cancelButton.trigger( 'click' ).then( function () {
			expect( wrapper.emitted().cancel ).toBeTruthy();
		} );
	} );
} );
