/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	Constants = require( '../../../../../resources/ext.wikilambda.edit/Constants.js' ),
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionDefinitionAliases = require( '../../../../../resources/ext.wikilambda.edit/components/function/definition/FunctionDefinitionAliases.vue' );

describe( 'FunctionDefinitionAliases', function () {
	var getters,
		actions,
		mockAliases = [
			{
				key: 'Z6K1',
				value: 'dummy value',
				parent: 36,
				id: 38
			}
		],
		injectZObjectMock = jest.fn();

	beforeEach( function () {
		getters = {
			getAllItemsFromListById: createGettersWithFunctionsMock( [ 'Z123123' ] ),
			getZObjectChildrenById: createGettersWithFunctionsMock( [ 'Z6', 'Z123123' ] ),
			getNestedZObjectById: createGettersWithFunctionsMock( { id: 10 } ),
			getNextObjectId: jest.fn( function () { return 5; } ),
			getCurrentZLanguage: jest.fn().mockReturnValue( 'Z10002' )
		};

		actions = {
			setZObjectValue: jest.fn(),
			addZObject: jest.fn(),
			addZString: jest.fn(),
			injectZObject: injectZObjectMock,
			removeZObjectChildren: jest.fn(),
			removeZObject: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );

	} );

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionDefinitionAliases );

		expect( wrapper.find( '.ext-wikilambda-editor-input-list-item' ) ).toBeTruthy();
	} );
	it( 'does not load chips if there are no aliases', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionDefinitionAliases );

		expect( wrapper.find( '.ext-wikilambda-chip' ).exists() ).toBeFalsy();
	} );
	it( 'does load chips if there are aliases', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionDefinitionAliases, {
			computed: {
				getFilteredCurrentLanguageAliases: function () {
					return mockAliases;
				}
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-chip' ) ).toBeTruthy();
	} );
	describe( 'addAliasForLanguage', function () {
		var wrapper;
		beforeEach( function () {
			wrapper = VueTestUtils.shallowMount( FunctionDefinitionAliases );
		} );
		it( 'adds a new alias for an existing language', function () {
			wrapper.vm.getLanguageAliasStringsetId = jest.fn( function () {
				return 5;
			} );
			wrapper.vm.getLanguageAliases = jest.fn().mockReturnValue( [ { id: 1, value: 'element' } ] );
			wrapper.vm.addAliasForLanguage( 'new alias' );

			var getLanguageAlias = wrapper.vm.getLanguageAliases();

			expect( actions.addZObject ).toHaveBeenCalled();
			expect( getLanguageAlias.length ).toBe( 1 );
			expect( actions.addZString ).toHaveBeenCalled();
		} );
		it( 'adds a new alias for a new language', function () {
			wrapper.vm.addAliasForLanguage( 'new alias' );
			var mockZObject = {
				zobject: {
					Z1K1: Constants.Z_MONOLINGUALSTRINGSET,
					Z31K1: 'Z10002',
					Z31K2: [ 'new alias' ]
				},
				key: '1',
				id: 5,
				parent: 10
			};

			expect( actions.addZObject ).toHaveBeenCalled();
			expect( injectZObjectMock ).toHaveBeenCalledWith( expect.anything(), mockZObject );
		} );
	} );
} );
