/*!
 * WikiLambda unit test suite for the function-definition-output component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionEditorOutput = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorOutput.vue' ),
	ZObjectSelector = require( '../../../../../resources/ext.wikilambda.edit/components/ZObjectSelector.vue' );

describe( 'FunctionEditorOutput', function () {
	var getters;

	beforeEach( function () {
		getters = {
			getNestedZObjectById: createGettersWithFunctionsMock( { id: 10 } )
		};

		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( FunctionEditorOutput );

		expect( wrapper.find( '.ext-wikilambda-function-definition-output' ).exists() ).toBeTruthy();
	} );
	it( 'loads the z-object-selector component', function () {
		var wrapper = shallowMount( FunctionEditorOutput );

		expect( wrapper.find( '.ext-wikilambda-function-definition-output__selector' ).exists() ).toBeTruthy();
	} );
	it( 'clears on focus-out if a value is typed but then not selected', function () {
		getters.getErrors = jest.fn( function () {
			return {};
		} );
		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = mount( FunctionEditorOutput );

		var outputTypeSelector = wrapper.get( '.ext-wikilambda-function-definition-output' ).getComponent( ZObjectSelector );

		outputTypeSelector.vm.clearResults = jest.fn();

		outputTypeSelector.vm.$emit( 'focus-out' );

		expect( outputTypeSelector.vm.clearResults ).toHaveBeenCalled();
	} );
} );
