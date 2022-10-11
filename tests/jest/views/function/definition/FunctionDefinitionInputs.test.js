/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionDefinitionInputs = require( '../../../../../resources/ext.wikilambda.edit/components/function/definition/FunctionDefinitionInputs.vue' );

describe( 'FunctionDefinitionInputs', function () {
	var getters,
		actions;

	beforeEach( function () {
		getters = {
			getNestedZObjectById: createGettersWithFunctionsMock( { id: 10 } ),
			getZObjectTypeById: createGettersWithFunctionsMock(),
			getAllItemsFromListById: createGettersWithFunctionsMock(),
			getNextObjectId: jest.fn()
		};
		actions = {
			addZObject: jest.fn(),
			addZArgument: jest.fn(),
			setAvailableZArguments: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters,
			actions
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( FunctionDefinitionInputs );

		expect( wrapper.find( '.ext-wikilambda-function-definition-inputs' ).exists() ).toBeTruthy();
	} );
} );
