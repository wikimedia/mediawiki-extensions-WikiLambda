/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ZTypedList = require( '../../../../resources/ext.wikilambda.app/components/types/ZTypedList.vue' );

// General use
const keyPath = 'main.Z2K2';
const objectValue = [
	{ Z1K1: 'Z9', Z9K1: 'Z6' },
	{ Z1K1: 'Z6', Z6K1: 'one' },
	{ Z1K1: 'Z6', Z6K1: 'two' },
	{ Z1K1: 'Z6', Z6K1: 'three' }
];

describe( 'ZTypedList', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					keyPath,
					objectValue,
					edit: false,
					expanded: false
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'does not render add list button', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					keyPath,
					objectValue,
					edit: false,
					expanded: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-typed-list__add-button' ).exists() ).toBe( false );
		} );

		it( 'does not render the list type when not expanded', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					keyPath,
					objectValue,
					edit: false,
					expanded: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-app-typed-list__type' ).exists() ).toBe( false );
		} );

		it( 'does render the list type when expanded', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					keyPath,
					objectValue,
					edit: false,
					expanded: true
				}
			} );
			expect( wrapper.getComponent( { name: 'wl-z-typed-list-type' } ).exists() ).toBe( true );
		} );

		it( 'renders the list item component when there are one or more list items', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					keyPath,
					objectValue,
					edit: false,
					expanded: false
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-typed-list-items' } ).exists() ).toBe( true );
		} );

		it( 'shows type and items when expanded', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					keyPath,
					objectValue,
					edit: false,
					expanded: true
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-typed-list-type' } ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'wl-z-typed-list-items' } ).exists() ).toBe( true );
		} );

		it( 'does not show type when not expanded', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					keyPath,
					objectValue,
					edit: false,
					expanded: false
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-typed-list-type' } ).exists() ).toBe( false );
			expect( wrapper.findComponent( { name: 'wl-z-typed-list-items' } ).exists() ).toBe( true );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders the add list button', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expanded: false
				},
				global: {
					stubs: {
						CdxButton: false,
						WlZTypedListType: false,
						WlZTypedListItems: false,
						WlKeyValueBlock: false,
						WlKeyBlock: false
					}
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-typed-list-items__add-button' ).exists() ).toBe( true );
		} );

		it( 'emits add-list-item when the add list item button is clicked', async () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expanded: false
				},
				global: {
					stubs: {
						CdxButton: false,
						WlZTypedListType: false,
						WlZTypedListItems: false,
						WlKeyValueBlock: false,
						WlKeyBlock: false
					}
				}
			} );

			wrapper.get( '.ext-wikilambda-app-typed-list-items__add-button' ).getComponent( { name: 'cdx-button' } ).vm.$emit( 'click' );
			expect( wrapper.emitted() ).toHaveProperty( 'add-list-item', [ [ { type: 'Z6' } ] ] );
		} );

		it( 'calls handleListTypeChange when type is changed', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expanded: true
				}
			} );

			const mockPayload = { keyPath: [], value: Constants.Z_OBJECT };

			wrapper.findComponent( { name: 'wl-z-typed-list-type' } ).vm.$emit( 'type-changed', mockPayload );

			expect( store.handleListTypeChange ).toHaveBeenCalledWith( {
				keyPath,
				objectValue,
				newType: Constants.Z_OBJECT
			} );
		} );
	} );
} );
