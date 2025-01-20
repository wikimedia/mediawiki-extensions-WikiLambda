/*!
 * WikiLambda unit test suite for the ModeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' ),
	shallowMount = require( '@vue/test-utils' ).shallowMount,
	mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock,
	Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' ),
	ModeSelector = require( '../../../../resources/ext.wikilambda.app/components/base/ModeSelector.vue' );

const mockLabels = {
	Z18: 'Argument reference',
	Z7: 'Function call',
	Z11: 'Monolingual text',
	Z60: 'Natural language',
	Z1: 'Object',
	Z9: 'Reference',
	Z6: 'String'
};

describe( 'ModeSelector', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getLabelData = createLabelDataMock( mockLabels );
		store.getParentRowId = createGettersWithFunctionsMock( 1 );
		store.getChildrenByParentRowId = createGettersWithFunctionsMock( [] );
		store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
		store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_OBJECT_TYPE );
		store.isCustomEnum = createGettersWithFunctionsMock( false );
		store.isInsideComposition = createGettersWithFunctionsMock( false );
		store.isWikidataFetch = createGettersWithFunctionsMock( false );
	} );

	describe( 'basic rendering', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ModeSelector, {
				props: {
					rowId: 1
				}
			} );
			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'renders the menu button', () => {
			const wrapper = mount( ModeSelector, {
				props: {
					rowId: 1
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			const toggleButton = wrapper.findComponent( { name: 'cdx-toggle-button' } );

			expect( menu.exists() ).toBe( true );
			expect( toggleButton.exists() ).toBe( true );
		} );

		it( 'opens the menu when button is clicked', async () => {
			const wrapper = mount( ModeSelector, {
				props: {
					rowId: 1
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			expect( menu.isVisible() ).toBe( false );

			const button = wrapper.findComponent( { name: 'cdx-toggle-button' } );
			button.trigger( 'click' );

			await wrapper.vm.$nextTick();

			await waitFor( () => expect( menu.isVisible() ).toBe( true ) );
		} );
	} );

	describe( 'it displays the correct options in the selector dropdown', () => {
		it( 'if a literal type is selected and its type is bound', () => {
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING_VALUE );
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_STRING
				}
			} );

			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 3 );
			expect( menu.vm.menuItems[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 1 ].value ).toBe( 'Z6' );
			expect( menu.vm.menuItems[ 2 ].value ).toBe( 'Z9' );
		} );

		it( 'if a literal type is selected and its type is unbound', () => {
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_PERSISTENTOBJECT_VALUE );
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_OBJECT
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 4 );
			expect( menu.vm.menuItems[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 1 ].value ).toBe( 'Z1' );
			expect( menu.vm.menuItems[ 2 ].value ).toBe( 'Z6' );
			expect( menu.vm.menuItems[ 3 ].value ).toBe( 'Z9' );
		} );

		it( 'if the type selector is inside a composition', () => {
			store.isInsideComposition = createGettersWithFunctionsMock( true );
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING_VALUE );
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_STRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 4 );
			expect( menu.vm.menuItems[ 0 ].value ).toBe( 'Z18' );
			expect( menu.vm.menuItems[ 1 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 2 ].value ).toBe( 'Z6' );
			expect( menu.vm.menuItems[ 3 ].value ).toBe( 'Z9' );
		} );

		it( 'if the type selected is a resolver type, shows the bound type if there is one', () => {
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING_VALUE );
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_STRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 3 );
			expect( menu.vm.menuItems[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 1 ].value ).toBe( 'Z6' );
			expect( menu.vm.menuItems[ 2 ].value ).toBe( 'Z9' );
		} );

		it( 'displays no resolvers or literal options for wikidata entities', () => {
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_PERSISTENTOBJECT_VALUE );
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL );
			store.isWikidataEntity = createGettersWithFunctionsMock( true );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_WIKIDATA_LEXEME
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );

			expect( menu.exists() ).toBe( false );
			expect( wrapper.vm.menuItems.length ).toBe( 0 );
		} );

		it( 'displays function call and literal for wikidata references', () => {
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_PERSISTENTOBJECT_VALUE );
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_REFERENCE_LEXEME );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 2 );
			expect( menu.vm.menuItems[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 1 ].value ).toBe( Constants.Z_WIKIDATA_REFERENCE_LEXEME );
		} );

		it( 'displays literals and resolvers for wikidata entity with unbound parent type', () => {
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_PERSISTENTOBJECT_VALUE );
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL );
			store.isWikidataEntity = createGettersWithFunctionsMock( true );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_OBJECT
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 3 );
			expect( menu.vm.menuItems[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 1 ].value ).toBe( 'Z1' );
			expect( menu.vm.menuItems[ 2 ].value ).toBe( 'Z9' );
		} );

		it( 'displays literals and resolvers for wikidata reference with unbound parent type', () => {
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_PERSISTENTOBJECT_VALUE );
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_REFERENCE_LEXEME );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_OBJECT
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 4 );
			expect( menu.vm.menuItems[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 1 ].value ).toBe( 'Z1' );
			expect( menu.vm.menuItems[ 2 ].value ).toBe( Constants.Z_WIKIDATA_REFERENCE_LEXEME );
			expect( menu.vm.menuItems[ 3 ].value ).toBe( 'Z9' );
		} );
	} );

	describe( 'set mode', () => {
		it( 'does not emit set-type when selected is same as current', async () => {
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING_VALUE );
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_STRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			menu.vm.$emit( 'update:selected', Constants.Z_REFERENCE );
			await waitFor( () => expect( wrapper.emitted() ).not.toHaveProperty( 'set-type' ) );
		} );

		it( 'emit set-type when selected is same as current', async () => {
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING_VALUE );
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_STRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			menu.vm.$emit( 'update:selected', Constants.Z_STRING );
			await waitFor( () => expect( wrapper.emitted() ).toHaveProperty( 'set-type' ) );
		} );
	} );

	describe( 'for list items', () => {
		beforeEach( () => {
			const listWithThreeItems = [
				{ key: '0', id: 2 },
				{ key: '1', id: 3 },
				{ key: '2', id: 4 },
				{ key: '3', id: 5 }
			];
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( '2' );
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING );
			store.getChildrenByParentRowId = createGettersWithFunctionsMock( listWithThreeItems );
		} );

		it( 'shows delete action as the last item', () => {
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 6 );
			expect( menu.vm.menuItems[ 5 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.DELETE_ITEM );
		} );

		it( 'emits delete-list-item event  when selecting delete menu option', async () => {
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			menu.vm.$emit( 'update:selected', Constants.LIST_MENU_OPTIONS.DELETE_ITEM );
			await waitFor( () => expect( wrapper.emitted() ).toHaveProperty( 'delete-list-item' ) );
		} );

		it( 'shows enabled move-before and move-after menu options', () => {
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 6 );
			expect( menu.vm.menuItems[ 3 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_BEFORE );
			expect( menu.vm.menuItems[ 3 ].disabled ).toBe( false );
			expect( menu.vm.menuItems[ 4 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_AFTER );
			expect( menu.vm.menuItems[ 4 ].disabled ).toBe( false );
		} );

		it( 'shows disabled move-before for the first item', () => {
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( '1' );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 6 );
			expect( menu.vm.menuItems[ 3 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_BEFORE );
			expect( menu.vm.menuItems[ 3 ].disabled ).toBe( true );
			expect( menu.vm.menuItems[ 4 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_AFTER );
			expect( menu.vm.menuItems[ 4 ].disabled ).toBe( false );
		} );

		it( 'shows disabled move-after for the last item', () => {
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( '3' );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 6 );
			expect( menu.vm.menuItems[ 3 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_BEFORE );
			expect( menu.vm.menuItems[ 3 ].disabled ).toBe( false );
			expect( menu.vm.menuItems[ 4 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_AFTER );
			expect( menu.vm.menuItems[ 4 ].disabled ).toBe( true );
		} );

		it( 'emits move-before event when selecting move-before menu option', async () => {
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );

			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			menu.vm.$emit( 'update:selected', Constants.LIST_MENU_OPTIONS.MOVE_BEFORE );
			await waitFor( () => expect( wrapper.emitted() ).toHaveProperty( 'move-before' ) );
		} );

		it( 'emits move-after event when selecting move-after menu option', async () => {
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );

			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			menu.vm.$emit( 'update:selected', Constants.LIST_MENU_OPTIONS.MOVE_AFTER );
			await waitFor( () => expect( wrapper.emitted() ).toHaveProperty( 'move-after' ) );
		} );
	} );
} );
