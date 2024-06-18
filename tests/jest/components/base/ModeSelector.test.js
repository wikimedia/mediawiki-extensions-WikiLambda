/*!
 * WikiLambda unit test suite for the ModeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' ),
	shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	ModeSelector = require( '../../../../resources/ext.wikilambda.edit/components/base/ModeSelector.vue' );

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
	let getters;

	beforeEach( () => {
		getters = {
			getLabelData: createLabelDataMock( mockLabels ),
			getParentRowId: createGettersWithFunctionsMock( 1 ),
			getChildrenByParentRowId: createGettersWithFunctionsMock( [] ),
			getZObjectTypeByRowId: createGettersWithFunctionsMock( Constants.Z_REFERENCE ),
			getZObjectKeyByRowId: createGettersWithFunctionsMock( Constants.Z_OBJECT_TYPE ),
			isCustomEnum: createGettersWithFunctionsMock( false ),
			isInsideComposition: createGettersWithFunctionsMock( false )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
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

		it( 'renders button and menu', () => {
			const wrapper = shallowMount( ModeSelector, {
				props: {
					rowId: 1
				}
			} );
			expect( wrapper.findComponent( { name: 'cdx-button' } ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'cdx-menu' } ).exists() ).toBe( true );
		} );

		it( 'opens the menu when button is clicked', async () => {
			const wrapper = shallowMount( ModeSelector, {
				props: {
					rowId: 1
				}
			} );
			const button = wrapper.findComponent( { name: 'cdx-button' } );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			button.vm.$emit( 'click' );
			await waitFor( () => expect( menu.vm.expanded ).toBe( true ) );
		} );
	} );

	describe( 'it displays the correct options in the selector dropdown', () => {
		it( 'if a literal type is selected and its type is bound', () => {
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING_VALUE );
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_STRING
				}
			} );

			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			expect( menu.vm.menuItems.length ).toBe( 3 );
			expect( menu.vm.menuItems[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 1 ].value ).toBe( 'Z6' );
			expect( menu.vm.menuItems[ 2 ].value ).toBe( 'Z9' );
		} );

		it( 'if a literal type is selected and its type is unbound', () => {
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_PERSISTENTOBJECT_VALUE );
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_OBJECT
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			expect( menu.vm.menuItems.length ).toBe( 4 );
			expect( menu.vm.menuItems[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 1 ].value ).toBe( 'Z1' );
			expect( menu.vm.menuItems[ 2 ].value ).toBe( 'Z6' );
			expect( menu.vm.menuItems[ 3 ].value ).toBe( 'Z9' );
		} );

		it( 'if the type selector is inside a composition', () => {
			getters.isInsideComposition = createGettersWithFunctionsMock( true );
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING_VALUE );
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_STRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			expect( menu.vm.menuItems.length ).toBe( 4 );
			expect( menu.vm.menuItems[ 0 ].value ).toBe( 'Z18' );
			expect( menu.vm.menuItems[ 1 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 2 ].value ).toBe( 'Z6' );
			expect( menu.vm.menuItems[ 3 ].value ).toBe( 'Z9' );
		} );

		it( 'if the type selected is a resolver type, shows the bound type if there is one', () => {
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING_VALUE );
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_STRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			expect( menu.vm.menuItems.length ).toBe( 3 );
			expect( menu.vm.menuItems[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 1 ].value ).toBe( 'Z6' );
			expect( menu.vm.menuItems[ 2 ].value ).toBe( 'Z9' );
		} );
	} );

	describe( 'set mode', () => {
		it( 'does not emit set-type when selected is same as current', async () => {
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING_VALUE );
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_STRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			menu.vm.$emit( 'update:selected', Constants.Z_REFERENCE );
			await waitFor( () => expect( wrapper.emitted() ).not.toHaveProperty( 'set-type' ) );
		} );

		it( 'emit set-type when selected is same as current', async () => {
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING_VALUE );
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_STRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
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
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( '2' );
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING );
			getters.getChildrenByParentRowId = createGettersWithFunctionsMock( listWithThreeItems );
			global.store.hotUpdate( { getters: getters } );
		} );

		it( 'shows delete footer action', () => {
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			expect( menu.vm.menuItems.length ).toBe( 5 );
			expect( menu.vm.footer.value ).toBe( Constants.LIST_MENU_OPTIONS.DELETE_ITEM );
		} );

		it( 'emits delete-list-item event if clicked delete footer action', async () => {
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
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
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			expect( menu.vm.menuItems.length ).toBe( 5 );
			expect( menu.vm.menuItems[ 3 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_BEFORE );
			expect( menu.vm.menuItems[ 3 ].disabled ).toBe( false );
			expect( menu.vm.menuItems[ 4 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_AFTER );
			expect( menu.vm.menuItems[ 4 ].disabled ).toBe( false );
		} );

		it( 'shows disabled move-before for the first item', () => {
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( '1' );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			expect( menu.vm.menuItems.length ).toBe( 5 );
			expect( menu.vm.menuItems[ 3 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_BEFORE );
			expect( menu.vm.menuItems[ 3 ].disabled ).toBe( true );
			expect( menu.vm.menuItems[ 4 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_AFTER );
			expect( menu.vm.menuItems[ 4 ].disabled ).toBe( false );
		} );

		it( 'shows disabled move-after for the last item', () => {
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( '3' );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			expect( menu.vm.menuItems.length ).toBe( 5 );
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

			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
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

			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			menu.vm.$emit( 'update:selected', Constants.LIST_MENU_OPTIONS.MOVE_AFTER );
			await waitFor( () => expect( wrapper.emitted() ).toHaveProperty( 'move-after' ) );
		} );
	} );
} );
