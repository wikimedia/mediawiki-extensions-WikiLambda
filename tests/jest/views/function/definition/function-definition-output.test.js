/*!
 * WikiLambda unit test suite for the function-definition-output component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionDefinitionOutput = require( '../../../../../resources/ext.wikilambda.edit/components/function/definition/function-definition-output.vue' );

describe( 'FunctionDefinitionOutput', function () {
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
		var wrapper = shallowMount( FunctionDefinitionOutput );

		expect( wrapper.find( '.ext-wikilambda-function-definition-output' ) ).toBeTruthy();
	} );
	it( 'loads the z-object-selector component', function () {
		var wrapper = shallowMount( FunctionDefinitionOutput );

		expect( wrapper.find( '.ext-wikilambda-function-definition-output__selector' ) ).toBeTruthy();
	} );
} );
