/*!
 * WikiLambda unit test suite for the default ZTypedListItems component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const ZTypedListItems = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZTypedListItems.vue' );

describe( 'ZTypedListItems', () => {

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					edit: false,
					expanded: false,
					listItemType: 'Z6',
					listItemsRowIds: [ 1, 2 ]
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-typed-list-items' ).exists() ).toBe( true );
		} );

		it( 'renders ZObjectKeyValue for each list item', () => {
			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					edit: false,
					expanded: false,
					listItemType: 'Z6',
					listItemsRowIds: [ 1, 2 ]
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
			} );

			expect( wrapper.findAllComponents( { name: 'wl-z-object-key-value' } ).length ).toBe( 2 );
		} );

		it( 'renders list items label when expanded', () => {
			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					edit: false,
					expanded: true,
					listItemType: 'Z6',
					listItemsRowIds: [ 1, 2 ]
				},
				global: {
					stubs: { WlKeyValueBlock: false, WlKeyBlock: false }
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
					expanded: false,
					listItemType: 'Z6',
					listItemsRowIds: [ 1, 2 ]
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
					edit: true,
					expanded: false,
					listItemType: 'Z6',
					listItemsRowIds: [ 1, 2 ]
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-typed-list-items' ).exists() ).toBe( true );
		} );
	} );
} );
