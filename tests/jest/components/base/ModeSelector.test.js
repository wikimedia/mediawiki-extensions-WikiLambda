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
			getLabel: () => ( key ) => mockLabels[ key ],
			getZObjectTypeByRowId: createGettersWithFunctionsMock( Constants.Z_REFERENCE ),
			getZObjectKeyByRowId: createGettersWithFunctionsMock( Constants.Z_OBJECT_TYPE ),
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
		it( 'shows delete footer action', () => {
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( '1' );
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			expect( menu.vm.menuItems.length ).toBe( 3 );
			expect( menu.vm.footer.value ).toBe( 'delete-list-item' );
		} );

		it( 'emits delete-list-item event if clicked delete footer action', async () => {
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( '1' );
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( ModeSelector, {
				props: {
					edit: true,
					parentExpectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			menu.vm.$emit( 'update:selected', 'delete-list-item' );
			await waitFor( () => expect( wrapper.emitted() ).toHaveProperty( 'delete-list-item' ) );
		} );
	} );
} );
