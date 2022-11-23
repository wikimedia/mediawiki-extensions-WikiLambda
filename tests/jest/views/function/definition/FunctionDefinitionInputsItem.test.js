/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { CdxLookup } = require( '@wikimedia/codex' );
const Constants = require( '../../../../../resources/ext.wikilambda.edit/Constants.js' );
var shallowMount = require( '@vue/test-utils' ).shallowMount,
	mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionDefinitionInputsItem = require( '../../../../../resources/ext.wikilambda.edit/components/function/definition/FunctionDefinitionInputsItem.vue' ),
	ZObjectSelector = require( '../../../../../resources/ext.wikilambda.edit/components/ZObjectSelector.vue' ),
	icons = require( '../../../fixtures/icons.json' );

describe( 'FunctionDefinitionInputsItem', function () {
	var getters,
		actions;

	beforeEach( function () {
		getters = {
			getZObjectChildrenById: createGettersWithFunctionsMock(),
			getNestedZObjectById: createGettersWithFunctionsMock( {} ),
			getZObjectTypeById: createGettersWithFunctionsMock(),
			getNextObjectId: jest.fn().mockReturnValue( 123 ),
			getCurrentZLanguage: jest.fn().mockReturnValue( 'Z10002' ),
			currentZObjectLanguages: () => [
				{
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
					[ Constants.Z_REFERENCE_ID ]: 'Z10002'
				},
				{
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
					[ Constants.Z_REFERENCE_ID ]: 'Z10004'
				}
			]
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

		expect( wrapper.find( '.ext-wikilambda-editor-input-list-item' ).exists() ).toBeTruthy();
	} );
	it( 'has an input element ', function () {
		var wrapper = shallowMount( FunctionDefinitionInputsItem );
		expect( wrapper.findComponent( { name: 'cdx-text-input' } ).exists() ).toBeTruthy();
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
		it( 'clears on focus-out if a value is typed but then not selected', function () {
			getters.getErrors = jest.fn( function () {
				return {};
			} );
			global.store.hotUpdate( {
				getters: getters
			} );
			var wrapper = mount( FunctionDefinitionInputsItem, {
				data() {
					return {
						icons: icons
					};
				},
				props: {
					canEditType: true
				}
			} );

			var inputTypeSelector = wrapper.get( '.ext-wikilambda-editor-input-list-item__body' ).getComponent( ZObjectSelector );

			var inputTypeSelectorLookup = wrapper.get( '.ext-wikilambda-select-zobject' ).getComponent( CdxLookup );
			inputTypeSelectorLookup.vm.$emit( 'input', 'S' );

			inputTypeSelector.vm.clearResults = jest.fn();

			inputTypeSelector.vm.$emit( 'focus-out' );

			expect( inputTypeSelector.vm.clearResults ).toHaveBeenCalled();
		} );
	} );
} );
