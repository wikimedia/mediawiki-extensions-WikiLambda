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
			getAllItemsFromListById: createGettersWithFunctionsMock( [] ),
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

	it( 'displays the "add an input" button if the user has edit permission and there are no arguments', function () {
		var wrapper = shallowMount( FunctionDefinitionInputs, {
			props: {
				canEdit: true
			},
			global: {
				stubs: { CdxButton: false }
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-function-definition-inputs__add-input-button' ).text() )
			.toEqual( 'Add an input' );
	} );

	it( 'displays the "add another input" button if the user has edit permission and there is an existing argument', function () {
		getters.getAllItemsFromListById = createGettersWithFunctionsMock( [
			{ id: 6, key: '1', value: 'object', parent: 4 }
		] );
		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = shallowMount( FunctionDefinitionInputs, {
			props: {
				canEdit: true
			},
			global: {
				stubs: { CdxButton: false }
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-function-definition-inputs__add-another-input-button' ).text() )
			.toEqual( 'Add another input' );
	} );

	it( 'does not display the "add input" if the user does not have edit permissions', function () {
		var wrapper = shallowMount( FunctionDefinitionInputs, {
			props: {
				canEdit: false
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-function-definition-inputs__add-input-button' ).exists() ).toBeFalsy();
	} );

	it( 'does not display the "add another input" button if the user does not have edit permissions', function () {
		getters.getAllItemsFromListById = createGettersWithFunctionsMock( [
			{ id: 6, key: '1', value: 'object', parent: 4 }
		] );
		global.store.hotUpdate( {
			getters: getters
		} );
		var wrapper = shallowMount( FunctionDefinitionInputs, {
			props: {
				canEdit: false
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-function-definition-inputs__add-another-input-button' ).exists() ).toBeFalsy();
	} );
} );
