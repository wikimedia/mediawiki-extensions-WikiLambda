/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionEditorName = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorName.vue' );

describe( 'FunctionEditorName', function () {
	var getters;

	beforeEach( function () {
		getters = {
			getNestedZObjectById: createGettersWithFunctionsMock( { id: 10 } ),
			getZObjectChildrenById: createGettersWithFunctionsMock(),
			getZkeyLabels: jest.fn(),
			getUserZlangZID: jest.fn(),
			getNextObjectId: jest.fn(),
			getZObjectLabel: createGettersWithFunctionsMock()
		};

		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( FunctionEditorName );

		expect( wrapper.find( '.ext-wikilambda-function-definition-name' ).exists() ).toBeTruthy();
	} );

	it( 'has an input box', function () {
		var wrapper = shallowMount( FunctionEditorName );
		expect( wrapper.find( '.ext-wikilambda-function-definition-name__input' ).exists() ).toBeTruthy();
	} );
} );
