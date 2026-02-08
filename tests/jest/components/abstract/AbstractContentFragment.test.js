/*!
 * WikiLambda unit test suite for the AbstractContentFragment component.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractContentFragment = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractContentFragment.vue' );

const keyPath = 'abstractwiki.sections.Q8776414.fragments.2';
const fragmentCall = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z444' }
};

describe( 'AbstractContentFragment', () => {
	let store;

	function renderFragment( props = {} ) {
		return shallowMount( AbstractContentFragment, {
			props: {
				keyPath,
				fragment: fragmentCall,
				edit: true,
				...props
			},
			global: {
				stubs: {
					'cdx-menu-button': true,
					'cdx-icon': true,
					'wl-z-object-key-value': true
				}
			}
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getParentListCount = jest.fn().mockReturnValue( 3 );
		store.getHighlightedFragment = undefined;
		store.setHighlightedFragment = jest.fn();
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFragment();

		expect( wrapper.find( '.ext-wikilambda-app-abstract-content-fragment' ).exists() ).toBe( true );
	} );

	it( 'renders default component node for fragment', () => {
		const wrapper = renderFragment();

		const fragmentComponent = wrapper.findComponent( { name: 'wl-z-object-key-value' } );

		expect( fragmentComponent.exists() ).toBe( true );
		expect( fragmentComponent.props( 'keyPath' ) ).toBe( keyPath );
		expect( fragmentComponent.props( 'objectValue' ) ).toEqual( fragmentCall );
		expect( fragmentComponent.props( 'edit' ) ).toBe( true );
	} );

	describe( 'fragment actions', () => {
		it( 'shows actions menu button when edit=true', () => {
			const wrapper = renderFragment();

			const menu = wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-menu' );

			expect( menu.exists() ).toBe( true );
		} );

		it( 'does not show actions menu button when edit=false', () => {
			const wrapper = renderFragment( { edit: false } );

			const menu = wrapper.find( '.ext-wikilambda-app-abstract-content-fragment-menu' );

			expect( menu.exists() ).toBe( false );
		} );

		it( 'emits action event when selecting a menu action', () => {
			const wrapper = renderFragment();

			const menuButton = wrapper.findComponent( { name: 'cdx-menu-button' } );
			menuButton.vm.$emit( 'update:selected', Constants.LIST_MENU_OPTIONS.DELETE_ITEM );

			expect( wrapper.emitted( 'action' ) ).toEqual( [
				[ { action: Constants.LIST_MENU_OPTIONS.DELETE_ITEM } ]
			] );
		} );

		it( 'disables move-before when fragment is first', () => {
			const wrapper = renderFragment( {
				keyPath: 'abstractwiki.sections.Q8776414.fragments.1'
			} );

			const moveBeforeItem =
				wrapper.vm.menuItems[ 0 ].items[ 0 ];

			expect( moveBeforeItem.disabled ).toBe( true );
		} );

		it( 'disables move-after when fragment is last', () => {
			const wrapper = renderFragment( {
				keyPath: 'abstractwiki.sections.Q8776414.fragments.3'
			} );

			const moveAfterItem =
				wrapper.vm.menuItems[ 0 ].items[ 1 ];

			expect( moveAfterItem.disabled ).toBe( true );
		} );
	} );

	describe( 'highlight fragments', () => {
		it( 'adds highlight class when fragment is highlighted in store', async () => {
			store.getHighlightedFragment = keyPath;

			const wrapper = renderFragment();

			expect( wrapper.classes() ).toContain( 'ext-wikilambda-app-abstract-content-fragment__highlight' );
		} );

		it( 'sets highlight on pointerenter', async () => {
			const wrapper = renderFragment();

			await wrapper.trigger( 'pointerenter' );

			expect( store.setHighlightedFragment ).toHaveBeenCalledWith( keyPath );
		} );

		it( 'unsets highlight on pointerleave', async () => {
			const wrapper = renderFragment();

			await wrapper.trigger( 'pointerleave' );

			expect( store.setHighlightedFragment ).toHaveBeenCalledWith( undefined );
		} );

		it( 'unsets highlight on focus and blur', async () => {
			const wrapper = renderFragment();

			await wrapper.trigger( 'focus' );
			await wrapper.trigger( 'blur' );

			expect( store.setHighlightedFragment ).toHaveBeenLastCalledWith( undefined );
		} );

		it( 'unsets highlight on unmount', () => {
			const wrapper = renderFragment();

			wrapper.unmount();

			expect( store.setHighlightedFragment ).toHaveBeenCalledWith( undefined );
		} );
	} );
} );
