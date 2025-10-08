/*!
 * WikiLambda unit test suite for the default ExpandedToggle component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ExpandedToggle = require( '../../../../resources/ext.wikilambda.app/components/base/ExpandedToggle.vue' );

describe( 'ExpandedToggle', () => {
	let store;

	/**
	 * Helper function to render ExpandedToggle component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @return {Object} Mounted wrapper
	 */
	function renderExpandedToggle( props = {} ) {
		const defaultProps = {
			expanded: true,
			hasExpandedMode: true
		};
		return shallowMount( ExpandedToggle, {
			props: { ...defaultProps, ...props },
			global: { stubs: { CdxButton: false } }
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.waitForRunningParsers = Promise.resolve();
	} );

	describe( 'when toggle is enabled', () => {
		it( 'renders without errors', () => {
			const wrapper = renderExpandedToggle();

			expect( wrapper.findComponent( { name: 'wl-expanded-toggle' } ).exists() ).toBe( true );
		} );

		it( 'expands when collapsed and button is clicked', async () => {
			const wrapper = renderExpandedToggle( {
				expanded: false // collapsed
			} );

			expect( wrapper.find( '.ext-wikilambda-app-expanded-toggle__icon--collapsed' ).exists() ).toBe( true );

			wrapper.findComponent( { name: 'cdx-button' } ).trigger( 'click' );
			expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-toggle-expanded-view' );

			await waitFor( () => expect( wrapper.emitted( 'toggle-expand' ) ).toBeTruthy() );
		} );

		it( 'collapses when expanded and button is clicked', async () => {
			const wrapper = renderExpandedToggle();

			expect( wrapper.find( '.ext-wikilambda-app-expanded-toggle__icon--expanded' ).exists() ).toBe( true );

			wrapper.findComponent( { name: 'cdx-button' } ).trigger( 'click' );
			expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-toggle-expanded-view' );

			await waitFor( () => expect( wrapper.emitted( 'toggle-expand' ) ).toBeTruthy() );
		} );
	} );

	describe( 'when toggle is disabled', () => {
		it( 'renders without errors', () => {
			const wrapper = renderExpandedToggle( {
				expanded: false,
				hasExpandedMode: false // not togglable
			} );

			expect( wrapper.findComponent( { name: 'wl-expanded-toggle' } ).exists() ).toBe( true );
		} );

		it( 'shows a non-collapse/expandable button', () => {
			const wrapper = renderExpandedToggle( {
				expanded: false,
				hasExpandedMode: false
			} );

			expect( wrapper.find( '.ext-wikilambda-app-expanded-toggle__icon--disabled' ).exists() ).toBe( true );
		} );
	} );
} );
