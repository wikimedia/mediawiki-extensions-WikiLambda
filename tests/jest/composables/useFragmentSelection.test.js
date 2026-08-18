/*!
 * WikiLambda unit test suite for the useFragmentSelection composable.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { ref } = require( 'vue' );
const { waitFor } = require( '@testing-library/vue' );

const loadComposable = require( '../helpers/loadComposable.js' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );
const useFragmentSelection = require( '../../../resources/ext.wikilambda.app/composables/useFragmentSelection.js' );

const keyPath = 'abstractwiki.sections.Q8776414.fragments.2';
const otherKeyPath = 'abstractwiki.sections.Q8776414.fragments.3';

describe( 'useFragmentSelection', () => {
	let store;
	let elementRef;
	let scrollIntoView;
	let matchMediaSpy;

	beforeEach( () => {
		store = useMainStore();
		store.getSelectedFragment = undefined;
		store.setSelectedFragment = jest.fn();

		scrollIntoView = jest.fn();
		elementRef = ref( { scrollIntoView } );

		matchMediaSpy = jest.fn().mockReturnValue( { matches: false } );
		window.matchMedia = matchMediaSpy;
	} );

	describe( 'isSelected', () => {
		it( 'is false when nothing is selected', () => {
			const [ result ] = loadComposable(
				() => useFragmentSelection( () => keyPath, elementRef )
			);

			expect( result.isSelected.value ).toBe( false );
		} );

		it( 'is true when this fragment is the selected one', () => {
			store.getSelectedFragment = keyPath;

			const [ result ] = loadComposable(
				() => useFragmentSelection( () => keyPath, elementRef )
			);

			expect( result.isSelected.value ).toBe( true );
		} );

		it( 'is false when another fragment is the selected one', () => {
			store.getSelectedFragment = otherKeyPath;

			const [ result ] = loadComposable(
				() => useFragmentSelection( () => keyPath, elementRef )
			);

			expect( result.isSelected.value ).toBe( false );
		} );

		it( 'is false when this fragment has no keyPath, even if nothing is selected', () => {
			const [ result ] = loadComposable(
				() => useFragmentSelection( () => undefined, elementRef )
			);

			expect( result.isSelected.value ).toBe( false );
		} );
	} );

	describe( 'selectFragment', () => {
		it( 'sets this fragment as the selected one', () => {
			const [ result ] = loadComposable(
				() => useFragmentSelection( () => keyPath, elementRef )
			);

			result.selectFragment();

			expect( store.setSelectedFragment ).toHaveBeenCalledWith( keyPath );
		} );
	} );

	describe( 'moving into view', () => {
		it( 'moves the element the smallest distance when it becomes selected', async () => {
			const [ , wrapper ] = loadComposable(
				() => useFragmentSelection( () => keyPath, elementRef )
			);

			store.getSelectedFragment = keyPath;
			await wrapper.vm.$nextTick();

			await waitFor( () => expect( scrollIntoView ).toHaveBeenCalledWith( {
				block: 'nearest',
				inline: 'nearest',
				behavior: 'smooth'
			} ) );
		} );

		it( 'does not move the element when another fragment becomes selected', async () => {
			const [ , wrapper ] = loadComposable(
				() => useFragmentSelection( () => keyPath, elementRef )
			);

			store.getSelectedFragment = otherKeyPath;
			await wrapper.vm.$nextTick();

			expect( scrollIntoView ).not.toHaveBeenCalled();
		} );

		it( 'does not animate when the user asks for less movement', async () => {
			matchMediaSpy.mockReturnValue( { matches: true } );

			const [ , wrapper ] = loadComposable(
				() => useFragmentSelection( () => keyPath, elementRef )
			);

			store.getSelectedFragment = keyPath;
			await wrapper.vm.$nextTick();

			await waitFor( () => expect( scrollIntoView ).toHaveBeenCalledWith(
				expect.objectContaining( { behavior: 'auto' } )
			) );
		} );

		it( 'does nothing when the element is not available', async () => {
			elementRef.value = null;

			const [ , wrapper ] = loadComposable(
				() => useFragmentSelection( () => keyPath, elementRef )
			);

			store.getSelectedFragment = keyPath;
			await wrapper.vm.$nextTick();

			expect( scrollIntoView ).not.toHaveBeenCalled();
		} );
	} );

	describe( 'on unmount', () => {
		it( 'gives up the selection when it holds it', () => {
			store.getSelectedFragment = keyPath;

			const [ , wrapper ] = loadComposable(
				() => useFragmentSelection( () => keyPath, elementRef )
			);

			wrapper.unmount();

			expect( store.setSelectedFragment ).toHaveBeenCalledWith( undefined );
		} );

		it( 'keeps the selection of another fragment', () => {
			store.getSelectedFragment = otherKeyPath;

			const [ , wrapper ] = loadComposable(
				() => useFragmentSelection( () => keyPath, elementRef )
			);

			wrapper.unmount();

			expect( store.setSelectedFragment ).not.toHaveBeenCalled();
		} );
	} );
} );
