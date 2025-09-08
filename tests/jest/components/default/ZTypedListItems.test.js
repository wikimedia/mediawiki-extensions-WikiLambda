/*!
 * WikiLambda unit test suite for the default ZTypedListItems component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const ZTypedListItems = require( '../../../../resources/ext.wikilambda.app/components/types/ZTypedListItems.vue' );

// General use
const keyPath = 'main.Z2K2';
const objectValue = [
	{ Z1K1: 'Z9', Z9K1: 'Z6' },
	{ Z1K1: 'Z6', Z6K1: 'one' },
	{ Z1K1: 'Z6', Z6K1: 'two' }
];

describe( 'ZTypedListItems', () => {

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					keyPath,
					objectValue,
					edit: false,
					expanded: false,
					listItemType: 'Z6'
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-typed-list-items' ).exists() ).toBe( true );
		} );

		it( 'renders ZObjectKeyValue for each list item', () => {
			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					keyPath,
					objectValue,
					edit: false,
					expanded: false,
					listItemType: 'Z6'
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
					keyPath,
					objectValue,
					edit: false,
					expanded: true,
					listItemType: 'Z6'
				},
				global: {
					stubs: { WlKeyValueBlock: false, WlKeyBlock: false }
				}
			} );

			const label = wrapper.findComponent( { name: 'wl-localized-label' } );
			expect( wrapper.findComponent( { name: 'wl-expanded-toggle' } ).exists() ).toBe( true );
			expect( label.exists() ).toBe( true );
			expect( label.vm.labelData.label ).toBe( 'Items' );
		} );

		it( 'does not render list items label when collapsed', () => {
			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					keyPath,
					objectValue,
					edit: false,
					expanded: false,
					listItemType: 'Z6'
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-expanded-toggle' } ).exists() ).toBe( false );
			expect( wrapper.findComponent( { name: 'wl-localized-label' } ).exists() ).toBe( false );
		} );

		it( 'shows empty state when no list items exist when collapsed', () => {
			const emptyObjectValue = [
				{ Z1K1: 'Z9', Z9K1: 'Z6' }
			];

			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					keyPath,
					objectValue: emptyObjectValue,
					edit: false,
					expanded: false,
					listItemType: 'Z6'
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
			} );

			const emptyState = wrapper.find( '.ext-wikilambda-app-typed-list-items__empty-state' );
			expect( emptyState.exists() ).toBe( true );
			expect( emptyState.text() ).toBe( '0 items' );
		} );

		it( 'shows empty state when no list items exist when expanded', () => {
			const emptyObjectValue = [
				{ Z1K1: 'Z9', Z9K1: 'Z6' }
			];

			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					keyPath,
					objectValue: emptyObjectValue,
					edit: false,
					expanded: true,
					listItemType: 'Z6'
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
			} );
			const emptyState = wrapper.find( '.ext-wikilambda-app-typed-list-items__empty-state' );
			expect( emptyState.exists() ).toBe( true );
			expect( emptyState.text() ).toBe( '0 items' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expanded: false,
					listItemType: 'Z6'
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-typed-list-items' ).exists() ).toBe( true );
		} );

		it( 'shows empty state when no list items exist', () => {
			const emptyObjectValue = [
				{ Z1K1: 'Z9', Z9K1: 'Z6' }
			];

			// Test view mode
			const wrapper = shallowMount( ZTypedListItems, {
				props: {
					keyPath,
					objectValue: emptyObjectValue,
					edit: false,
					expanded: false,
					listItemType: 'Z6'
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
			} );

			const emptyState = wrapper.find( '.ext-wikilambda-app-typed-list-items__empty-state' );
			expect( emptyState.exists() ).toBe( true );
			expect( emptyState.text() ).toBe( '0 items' );
			expect( emptyState.classes() ).toContain( 'ext-wikilambda-app-typed-list-items__empty-state' );
		} );
	} );
} );
