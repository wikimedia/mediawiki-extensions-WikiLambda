/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionDefinitionInputsItem = require( '../../../../../resources/ext.wikilambda.edit/components/function/definition/FunctionDefinitionInputsItem.vue' );

describe( 'FunctionDefinitionInputsItem', function () {
	var getters,
		actions;

	beforeEach( function () {
		getters = {
			getZObjectChildrenById: createGettersWithFunctionsMock(),
			getNestedZObjectById: createGettersWithFunctionsMock( { } ),
			getZObjectTypeById: createGettersWithFunctionsMock(),
			getNextObjectId: jest.fn().mockReturnValue( 123 ),
			getCurrentZLanguage: jest.fn().mockReturnValue( 'Z10002' )
		};

		actions = {
			setZObjectValue: jest.fn(),
			addZMonolingualString: jest.fn(),
			changeType: jest.fn(),
			setTypeOfTypedList: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( FunctionDefinitionInputsItem );

		expect( wrapper.find( '.ext-wikilambda-editor-input-list-item' ) ).toBeTruthy();
	} );
	it( 'has an input element ', function () {
		var wrapper = shallowMount( FunctionDefinitionInputsItem );
		expect( wrapper.find( 'input' ).exists() ).toBeTruthy();
	} );
	describe( 'setArgumentLabel', function () {
		it( 'does not set argument label if there is none', function () {
			var wrapper = shallowMount( FunctionDefinitionInputsItem );

			wrapper.vm.getArgumentLabels = jest.fn().mockReturnValue( {} );
			wrapper.vm.setArgumentLabel();

			expect( actions.addZMonolingualString ).not.toHaveBeenCalled();
		} );
		it( 'adds a new language', function () {
			var mockZLabel = {
				id: 151,
				key: 'Z1K1',
				parent: 150,
				value: 'object'
			};

			getters.getNestedZObjectById = createGettersWithFunctionsMock( mockZLabel );
			getters.getZObjectChildrenById = createGettersWithFunctionsMock( [ mockZLabel ] );

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = shallowMount( FunctionDefinitionInputsItem, {
				props: {
					zLang: 'Z10002'
				}
			} );

			wrapper.vm.setArgumentLabel();
			expect( actions.addZMonolingualString ).toHaveBeenCalled();
			expect( actions.addZMonolingualString ).toHaveBeenCalledWith(
				expect.anything(),
				{ lang: 'Z10002', parentId: mockZLabel.id }
			);
		} );
	} );
} );
