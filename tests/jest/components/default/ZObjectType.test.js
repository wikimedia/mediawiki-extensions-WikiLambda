/*!
 * WikiLambda unit test suite for the default ZObjectType component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	ZObjectType = require( '../../../../resources/ext.wikilambda.edit/components/default/ZObjectType.vue' ),
	ZObjectSelector = require( '../../../../resources/ext.wikilambda.edit/components/ZObjectSelector.vue' );

describe( 'ZReference', () => {
	var getters;
	beforeEach( () => {
		getters = {
			isInsideComposition: createGettersWithFunctionsMock( false ),
			getParentExpectedType: createGettersWithFunctionsMock( false ),
			getLabel: createGettersWithFunctionsMock( { zid: 'Z17', label: 'Argument declaration', lang: 'Z1002' } ),
			getZReferenceTerminalValue: createGettersWithFunctionsMock( 'Z17' ),
			getZObjectKeyByRowId: createGettersWithFunctionsMock( '0' )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZObjectType, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays the reference link with label if there is one', () => {
			var wrapper = shallowMount( ZObjectType, {
				props: {
					edit: false
				}
			} );

			const referenceLink = wrapper.get( 'a' );
			expect( referenceLink.attributes().href ).toBe( '/wiki/Z17' );
			expect( referenceLink.text() ).toBe( 'Argument declaration' );
		} );

		it( 'displays the reference link with its value if there is no label', () => {
			getters.getLabel = createGettersWithFunctionsMock();

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = shallowMount( ZObjectType, {
				props: {
					edit: false
				}
			} );

			const referenceLink = wrapper.get( 'a' );
			expect( referenceLink.attributes().href ).toBe( '/wiki/Z17' );
			expect( referenceLink.text() ).toBe( 'Z17' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZObjectType, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays a type selector if there is no initial value, and emits the selected type on type change', async () => {
			getters.getZReferenceTerminalValue = createGettersWithFunctionsMock();

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = shallowMount( ZObjectType, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-type-mode__selector' ).exists() ).toBeTruthy();
			expect( wrapper.vm.selectType ).toBe( Constants.Z_TYPE );

			await wrapper.getComponent( ZObjectSelector ).vm.$emit( 'input', 'String' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [], value: 'String' } ] ] );
		} );

		it( 'if there is an initial value, binds the value of the selected type to the selector', () => {
			var wrapper = shallowMount( ZObjectType, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.findComponent( { name: 'cdx-select' } ).vm.selected ).toEqual( 'Z17' );
		} );

		it( 'emits a selector change value', () => {
			var wrapper = shallowMount( ZObjectType, {
				props: {
					edit: true
				}
			} );

			wrapper.findComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected', 'String' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [], value: 'String' } ] ] );
		} );

		describe( 'it displays the correct options in the selector dropdown', () => {
			it( 'if a literal type is selected', async () => {
				var wrapper = shallowMount( ZObjectType, {
					props: {
						edit: true
					}
				} );

				expect( wrapper.findComponent( { name: 'cdx-select' } ).vm.menuItems.length ).toBe( 3 );

				// Resolver type: Z-Reference
				expect( wrapper.findComponent( { name: 'cdx-select' } ).vm.menuItems[ 0 ].value ).toBe( 'Z9' );

				// Resolver type: Z Function Call
				expect( wrapper.findComponent( { name: 'cdx-select' } ).vm.menuItems[ 1 ].value ).toBe( 'Z7' );

				// Resolver type: Selected value type
				expect( wrapper.findComponent( { name: 'cdx-select' } ).vm.menuItems[ 2 ].value ).toBe( 'Z17' );
			} );

			it( 'if the type selector is inside a composition', async () => {
				getters.isInsideComposition = createGettersWithFunctionsMock( true );

				global.store.hotUpdate( {
					getters: getters
				} );

				var wrapper = shallowMount( ZObjectType, {
					props: {
						edit: true,
						expectedType: Constants.Z_STRING
					}
				} );

				expect( wrapper.findComponent( { name: 'cdx-select' } ).vm.menuItems.length ).toBe( 4 );

				// Resolver type: Z-Reference
				expect( wrapper.findComponent( { name: 'cdx-select' } ).vm.menuItems[ 0 ].value ).toBe( 'Z9' );

				// Resolver type: Z Function Call
				expect( wrapper.findComponent( { name: 'cdx-select' } ).vm.menuItems[ 1 ].value ).toBe( 'Z7' );

				// Resolver type: Z Argument Reference
				expect( wrapper.findComponent( { name: 'cdx-select' } ).vm.menuItems[ 2 ].value ).toBe( 'Z18' );

				// Selected value type
				expect( wrapper.findComponent( { name: 'cdx-select' } ).vm.menuItems[ 3 ].value ).toBe( 'Z17' );
			} );

			it( 'if the type selected is a resolver type, shows the bound type if there is one', async () => {
				getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z18' );

				global.store.hotUpdate( {
					getters: getters
				} );

				var wrapper = shallowMount( ZObjectType, {
					props: {
						edit: true,
						expectedType: Constants.Z_STRING
					}
				} );

				expect( wrapper.findComponent( { name: 'cdx-select' } ).vm.menuItems.length ).toBe( 3 );

				// Resolver type: Z-Reference
				expect( wrapper.findComponent( { name: 'cdx-select' } ).vm.menuItems[ 0 ].value ).toBe( 'Z9' );

				// Resolver type: Z Function Call
				expect( wrapper.findComponent( { name: 'cdx-select' } ).vm.menuItems[ 1 ].value ).toBe( 'Z7' );

				// Selected value type
				expect( wrapper.findComponent( { name: 'cdx-select' } ).vm.menuItems[ 2 ].value ).toBe( 'Z6' );
			} );
		} );

		it( 'adds focus styling on selector focus', async () => {
			getters.getZReferenceTerminalValue = createGettersWithFunctionsMock();

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = shallowMount( ZObjectType, {
				props: {
					edit: true
				}
			} );

			var selector = wrapper.get( '.ext-wikilambda-type-mode__selector' ).getComponent( ZObjectSelector );
			expect( wrapper.find( '.ext-wikilambda-type-mode__selector-active' ).exists() ).toBeFalsy();

			selector.vm.$emit( 'focus' );
			await wrapper.vm.$nextTick();

			expect( wrapper.find( '.ext-wikilambda-type-mode__selector-active' ).exists() ).toBeTruthy();

			selector.vm.$emit( 'focus-out' );
			await wrapper.vm.$nextTick();

			expect( wrapper.find( '.ext-wikilambda-type-mode__selector-active' ).exists() ).toBeFalsy();
		} );
	} );
} );