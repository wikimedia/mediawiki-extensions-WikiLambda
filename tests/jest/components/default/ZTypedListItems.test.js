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

	/**
	 * Helper function to render ZTypedListItems component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderZTypedListItems( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false,
			expanded: false,
			listItemType: 'Z6'
		};
		const defaultOptions = {
			global: {
				stubs: {
					WlKeyValueBlock: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( ZTypedListItems, { props: { ...defaultProps, ...props }, ...defaultOptions } );
	}

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderZTypedListItems();

			expect( wrapper.find( '.ext-wikilambda-app-typed-list-items' ).exists() ).toBe( true );
		} );

		it( 'renders ZObjectKeyValue for each list item', () => {
			const wrapper = renderZTypedListItems();

			expect( wrapper.findAllComponents( { name: 'wl-z-object-key-value' } ).length ).toBe( 2 );
		} );

		it( 'renders list items label when expanded', () => {
			const wrapper = renderZTypedListItems( {
				expanded: true
			}, {
				stubs: { WlKeyBlock: false }
			} );

			const label = wrapper.findComponent( { name: 'wl-localized-label' } );
			expect( wrapper.findComponent( { name: 'wl-expanded-toggle' } ).exists() ).toBe( true );
			expect( label.exists() ).toBe( true );
			expect( label.vm.labelData.label ).toBe( 'Items' );
		} );

		it( 'does not render list items label when collapsed', () => {
			const wrapper = renderZTypedListItems();

			expect( wrapper.findComponent( { name: 'wl-expanded-toggle' } ).exists() ).toBe( false );
			expect( wrapper.findComponent( { name: 'wl-localized-label' } ).exists() ).toBe( false );
		} );

		it( 'shows empty state when no list items exist when collapsed', () => {
			const emptyObjectValue = [
				{ Z1K1: 'Z9', Z9K1: 'Z6' }
			];

			const wrapper = renderZTypedListItems( {
				objectValue: emptyObjectValue
			} );

			const emptyState = wrapper.find( '.ext-wikilambda-app-typed-list-items__empty-state' );
			expect( emptyState.exists() ).toBe( true );
			expect( emptyState.text() ).toBe( '0 items' );
		} );

		it( 'shows empty state when no list items exist when expanded', () => {
			const emptyObjectValue = [
				{ Z1K1: 'Z9', Z9K1: 'Z6' }
			];

			const wrapper = renderZTypedListItems( {
				objectValue: emptyObjectValue,
				expanded: true
			} );
			const emptyState = wrapper.find( '.ext-wikilambda-app-typed-list-items__empty-state' );
			expect( emptyState.exists() ).toBe( true );
			expect( emptyState.text() ).toBe( '0 items' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderZTypedListItems( { edit: true } );

			expect( wrapper.find( '.ext-wikilambda-app-typed-list-items' ).exists() ).toBe( true );
		} );

		it( 'shows empty state when no list items exist', () => {
			const emptyObjectValue = [
				{ Z1K1: 'Z9', Z9K1: 'Z6' }
			];

			// Test view mode
			const wrapper = renderZTypedListItems( {
				objectValue: emptyObjectValue
			} );

			const emptyState = wrapper.find( '.ext-wikilambda-app-typed-list-items__empty-state' );
			expect( emptyState.exists() ).toBe( true );
			expect( emptyState.text() ).toBe( '0 items' );
			expect( emptyState.classes() ).toContain( 'ext-wikilambda-app-typed-list-items__empty-state' );
		} );
	} );
} );
