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
		store.getSelectedFragment = undefined;
		store.setSelectedFragment = jest.fn();
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

		it( 'sets highlight when the focus moves into the fragment', async () => {
			const wrapper = renderFragment();

			await wrapper.trigger( 'focusin' );

			expect( store.setHighlightedFragment ).toHaveBeenCalledWith( keyPath );
		} );

		it( 'unsets highlight when the focus leaves the fragment', async () => {
			const wrapper = renderFragment();

			await wrapper.trigger( 'focusin' );
			await wrapper.trigger( 'focusout' );

			expect( store.setHighlightedFragment ).toHaveBeenLastCalledWith( undefined );
		} );

		it( 'unsets highlight on unmount', () => {
			const wrapper = renderFragment();

			wrapper.unmount();

			expect( store.setHighlightedFragment ).toHaveBeenCalledWith( undefined );
		} );
	} );

	describe( 'fragment selection', () => {
		it( 'is not selected when another fragment is selected', () => {
			store.getSelectedFragment = 'abstractwiki.sections.Q8776414.fragments.1';

			const wrapper = renderFragment();

			expect( wrapper.classes() ).not.toContain( 'ext-wikilambda-app-abstract-content-fragment__selected' );
			expect( wrapper.attributes( 'aria-current' ) ).toBeUndefined();
		} );

		it( 'marks itself as selected and current when it is the selected fragment', () => {
			store.getSelectedFragment = keyPath;

			const wrapper = renderFragment();

			expect( wrapper.classes() ).toContain( 'ext-wikilambda-app-abstract-content-fragment__selected' );
			expect( wrapper.attributes( 'aria-current' ) ).toBe( 'true' );
		} );

		it( 'selects the fragment on click', async () => {
			const wrapper = renderFragment();

			await wrapper.trigger( 'click' );

			expect( store.setSelectedFragment ).toHaveBeenCalledWith( keyPath );
		} );

		it( 'selects the fragment when the focus moves into it', async () => {
			const wrapper = renderFragment();

			await wrapper.trigger( 'focusin' );

			expect( store.setSelectedFragment ).toHaveBeenCalledWith( keyPath );
		} );

		it( 'moves itself into view when it becomes the selected fragment', async () => {
			const wrapper = renderFragment();
			const scrollIntoView = jest.fn();
			wrapper.element.scrollIntoView = scrollIntoView;

			store.getSelectedFragment = keyPath;
			await wrapper.vm.$nextTick();

			expect( scrollIntoView ).toHaveBeenCalledWith( expect.objectContaining( {
				block: 'nearest',
				inline: 'nearest'
			} ) );
		} );

		it( 'does not move itself into view while it is not selected', async () => {
			const wrapper = renderFragment();
			const scrollIntoView = jest.fn();
			wrapper.element.scrollIntoView = scrollIntoView;

			store.getSelectedFragment = 'abstractwiki.sections.Q8776414.fragments.1';
			await wrapper.vm.$nextTick();

			expect( scrollIntoView ).not.toHaveBeenCalled();
		} );

		it( 'gives up the selection on unmount, so it cannot point at a gone fragment', () => {
			store.getSelectedFragment = keyPath;
			const wrapper = renderFragment();

			wrapper.unmount();

			expect( store.setSelectedFragment ).toHaveBeenCalledWith( undefined );
		} );

		it( 'keeps the selection of another fragment on unmount', () => {
			store.getSelectedFragment = 'abstractwiki.sections.Q8776414.fragments.1';
			const wrapper = renderFragment();

			wrapper.unmount();

			expect( store.setSelectedFragment ).not.toHaveBeenCalled();
		} );
	} );

	describe( 'fragment hashing', () => {
		beforeEach( () => {
			jest.useFakeTimers();
		} );

		afterEach( () => {
			jest.useRealTimers();
		} );

		it( 'emits rehash event after debounce when fragment content changes', async () => {
			const wrapper = renderFragment();

			// Test deep=true by changing a fragment nested value
			wrapper.vm.$props.fragment.Z7K1.Z9K1 = 'Z10000';
			await wrapper.vm.$nextTick();

			expect( wrapper.emitted( 'rehash' ) ).toBeFalsy();

			jest.advanceTimersByTime( 3000 );
			await wrapper.vm.$nextTick();

			expect( wrapper.emitted( 'rehash' ) ).toHaveLength( 1 );
		} );

		it( 'emits rehash event after debounce when the whole fragment changes', async () => {
			const wrapper = renderFragment();

			await wrapper.setProps( { fragment: {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
				Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10000' },
				Z10000K1: { Z1K1: 'Z6', Z6K1: 'foo' },
				Z10000K2: { Z1K1: 'Z6', Z6K1: 'bar' }
			} } );
			await wrapper.vm.$nextTick();

			expect( wrapper.emitted( 'rehash' ) ).toBeFalsy();

			jest.advanceTimersByTime( 3000 );
			await wrapper.vm.$nextTick();

			expect( wrapper.emitted( 'rehash' ) ).toHaveLength( 1 );
		} );

		it( 'debounces multiple changes and emits rehash only once', async () => {
			const wrapper = renderFragment();

			const waitAndEdit = async ( wait, key, value ) => {
				jest.advanceTimersByTime( wait );
				await wrapper.vm.$nextTick();
				wrapper.vm.$props.fragment[ key ].Z6K1 = value;
			};

			// Simulate multiple edits, separated by arbitrary times, each one
			// of them lower than the debounce time, but together are longer (>2000)
			await wrapper.setProps( { fragment: {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
				Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10000' },
				Z10000K1: { Z1K1: 'Z6', Z6K1: '' },
				Z10000K2: { Z1K1: 'Z6', Z6K1: '' }
			} } );
			await waitAndEdit( 100, 'Z10000K1', 'a' );
			await waitAndEdit( 500, 'Z10000K1', 'ab' );
			await waitAndEdit( 700, 'Z10000K1', 'abc' );
			await waitAndEdit( 500, 'Z10000K2', 'e' );
			await waitAndEdit( 800, 'Z10000K2', 'ef' );
			await waitAndEdit( 300, 'Z10000K2', 'efg' );

			// Simulate inactivity by waiting a bit longer than the debouncer time
			jest.advanceTimersByTime( 2100 );
			await wrapper.vm.$nextTick();

			expect( wrapper.emitted( 'rehash' ) ).toHaveLength( 1 );
		} );
	} );
} );
