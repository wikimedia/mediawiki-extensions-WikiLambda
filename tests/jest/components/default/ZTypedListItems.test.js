/*!
 * WikiLambda unit test suite for the default ZTypedListItems component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	ZTypedListItems = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZTypedListItems.vue' );

describe( 'ZTypedListItems', () => {
	let getters;

	beforeEach( () => {
		getters = {
			getZObjectTypeByRowId: createGettersWithFunctionsMock( 'Z6' ),
			getChildrenByParentRowId: createGettersWithFunctionsMock( [
				{ id: 28, key: '0', parent: 27, value: Constants.ROW_VALUE_OBJECT },
				{ id: 39, key: '1', parent: 27, value: Constants.ROW_VALUE_OBJECT },
				{ id: 41, key: '2', parent: 27, value: Constants.ROW_VALUE_OBJECT }
			] ),
			getUserLangZid: createGettersWithFunctionsMock( 'Z1003' )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-ztyped-list-items' ).exists() ).toBe( true );
		} );

		it( 'renders ZObjectKeyValue for each list item', () => {
			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.findAllComponents( { name: 'wl-z-object-key-value' } ).length ).toBe( 2 );
		} );

		it( 'renders list items label when expanded', () => {
			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					edit: false,
					expanded: true
				}
			} );

			const label = wrapper.findComponent( { name: 'wl-localized-label' } );
			expect( wrapper.findComponent( { name: 'wl-expanded-toggle' } ).exists() ).toBe( true );
			expect( label.exists() ).toBe( true );
			expect( label.vm.labelData.label ).toBe( 'List items' );
		} );

		it( 'does not render list items label when collapsed', () => {
			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					edit: false,
					expanded: false
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-expanded-toggle' } ).exists() ).toBe( false );
			expect( wrapper.findComponent( { name: 'wl-localized-label' } ).exists() ).toBe( false );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-ztyped-list-items' ).exists() ).toBe( true );
		} );
	} );
} );
