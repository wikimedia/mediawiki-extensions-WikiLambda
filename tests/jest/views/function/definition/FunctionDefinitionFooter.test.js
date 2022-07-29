/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	DialogContainer = require( '../../../../../resources/ext.wikilambda.edit/components/base/DialogContainer.vue' ),
	FunctionDefinitionFooter = require( '../../../../../resources/ext.wikilambda.edit/components/function/definition/FunctionDefinitionFooter.vue' );

describe( 'FunctionDefinitionFooter', function () {
	var getters;

	beforeEach( function () {
		getters = {
			currentZFunctionHasInputs: jest.fn(),
			currentZFunctionHasOutput: jest.fn(),
			isNewZObject: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters
		} );

	} );

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionDefinitionFooter );

		expect( wrapper.find( '.ext-wikilambda-function-definition-footer' ) ).toBeTruthy();
	} );
	it( 'triggers publish on button click', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionDefinitionFooter, {
			props: {
				isEditing: true
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-definition-footer__publish-button' ) ).toBeTruthy();
		wrapper.find( '.ext-wikilambda-function-definition-footer__publish-button' ).trigger( 'click' );
		wrapper.vm.$nextTick( function () {
			wrapper.vm.handlePublish();
			expect( wrapper.emitted().publish ).toBeTruthy();
		} );
	} );
	it( 'opens the dialog on cancel when editing', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionDefinitionFooter, {
			props: {
				isEditing: true
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-function-definition-footer__actions__cancel' ) ).toBeTruthy();
		wrapper.find( '.ext-wikilambda-function-definition-footer__actions__cancel' ).trigger( 'click' );
		expect( wrapper.findComponent( DialogContainer ) ).toBeTruthy();
	} );
} );
