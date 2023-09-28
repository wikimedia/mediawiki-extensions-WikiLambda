/*!
 * WikiLambda unit test suite for the default ZArgumentReference component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	ZArgumentReference = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZArgumentReference.vue' );

describe( 'ZArgumentReference', () => {

	var getters;

	beforeEach( () => {
		getters = {
			getZImplementationFunctionZid: createGettersWithFunctionsMock( 'Z10001' ),
			getLabel: createGettersWithFunctionsMock( 'input' ),
			getZObjectKeyByRowId: createGettersWithFunctionsMock( 'Z802K1' ),
			getZStringTerminalValue: createGettersWithFunctionsMock( 'Z10001K1' ),
			getRowByKeyPath: createGettersWithFunctionsMock( { id: 2 } ),
			getInputsOfFunctionZid: createGettersWithFunctionsMock( [
				{ Z17K2: 'Z10001K1' },
				{ Z17K2: 'Z10001K2' },
				{ Z17K2: 'Z10001K3' }
			] ),
			getZPersistentContentRowId: createGettersWithFunctionsMock( 1 )
		};
		global.store.hotUpdate( { getters: getters } );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZArgumentReference, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-argument-reference' ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
		} );

		it( 'displays empty string when nothing selected', () => {
			getters.getRowByKeyPath = createGettersWithFunctionsMock( undefined );
			getters.getZStringTerminalValue = createGettersWithFunctionsMock( undefined );
			getters.getLabel = createGettersWithFunctionsMock( '' );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( ZArgumentReference, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-argument-reference' ).text() ).toBe( '' );
		} );

		it( 'displays the argument key when it has no label', () => {
			getters.getZStringTerminalValue = createGettersWithFunctionsMock( 'Z10001K1' );
			getters.getLabel = createGettersWithFunctionsMock( 'Z10001K1' );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( ZArgumentReference, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-argument-reference' ).text() ).toBe( 'Z10001K1' );
		} );

		it( 'displays the argument label when available', () => {
			const wrapper = shallowMount( ZArgumentReference, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-argument-reference' ).text() ).toBe( 'input' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZArgumentReference, {
				props: {
					edit: true
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-argument-reference' ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'wl-select' } ).exists() ).toBe( true );
		} );

		it( 'renders the selector with all possible choices', () => {
			getters.getLabel = () => ( zid ) => {
				const labels = { Z10001K1: 'first', Z10001K2: 'second' };
				return labels[ zid ] || zid;
			};
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( ZArgumentReference, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-select' } ).vm.menuItems.length ).toBe( 3 );
			// First item Z10001K1 with label "first"
			expect( wrapper.findComponent( { name: 'wl-select' } ).vm.menuItems[ 0 ].value ).toBe( 'Z10001K1' );
			expect( wrapper.findComponent( { name: 'wl-select' } ).vm.menuItems[ 0 ].label ).toBe( 'first' );
			// Second item Z10001K2 with label "second"
			expect( wrapper.findComponent( { name: 'wl-select' } ).vm.menuItems[ 1 ].value ).toBe( 'Z10001K2' );
			expect( wrapper.findComponent( { name: 'wl-select' } ).vm.menuItems[ 1 ].label ).toBe( 'second' );
			// Second item Z10001K3 with no label
			expect( wrapper.findComponent( { name: 'wl-select' } ).vm.menuItems[ 2 ].value ).toBe( 'Z10001K3' );
			expect( wrapper.findComponent( { name: 'wl-select' } ).vm.menuItems[ 2 ].label ).toBe( 'Z10001K3' );
		} );

		it( 'renders the selector with empty value set', () => {
			getters.getRowByKeyPath = createGettersWithFunctionsMock( undefined );
			getters.getZStringTerminalValue = createGettersWithFunctionsMock( undefined );
			getters.getLabel = createGettersWithFunctionsMock( '' );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( ZArgumentReference, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-select' } ).vm.selected ).toEqual( '' );
		} );

		it( 'renders the selector with current value set', () => {
			const wrapper = shallowMount( ZArgumentReference, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-select' } ).vm.selected ).toEqual( 'Z10001K1' );
		} );

		it( 'selects a new value when the component is used for the whole Z18 object in collapsed mode', () => {
			const wrapper = shallowMount( ZArgumentReference, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-select' } ).vm.selected ).toEqual( 'Z10001K1' );

			wrapper.findComponent( { name: 'wl-select' } ).vm.$emit( 'update:selected', 'Z10001K2' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				keyPath: [ Constants.Z_ARGUMENT_REFERENCE_KEY, Constants.Z_STRING_VALUE ],
				value: 'Z10001K2'
			} ] ] );
		} );

		it( 'selects a new value when the component used for Z18K1 key', () => {
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z18K1' );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( ZArgumentReference, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-select' } ).vm.selected ).toEqual( 'Z10001K1' );

			wrapper.findComponent( { name: 'wl-select' } ).vm.$emit( 'update:selected', 'Z10001K2' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				keyPath: [ Constants.Z_STRING_VALUE ],
				value: 'Z10001K2'
			} ] ] );
		} );
	} );
} );
