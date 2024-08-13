/*!
 * WikiLambda unit test suite for the default ExpandedToggle component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	{ waitFor } = require( '@testing-library/vue' ),
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	ExpandedToggle = require( '../../../../resources/ext.wikilambda.app/components/base/ExpandedToggle.vue' );

describe( 'ExpandedToggle', () => {
	beforeEach( () => {
		getters = {
			waitForRunningParsers: createGetterMock( Promise.resolve() )
		};
		global.store.hotUpdate( { getters: getters } );
	} );

	describe( 'when toggle is enabled', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ExpandedToggle, {
				props: {
					expanded: true,
					hasExpandedMode: true // togglable
				},
				global: { stubs: { CdxButton: false } }
			} );

			expect( wrapper.findComponent( { name: 'wl-expanded-toggle' } ).exists() ).toBe( true );
		} );

		it( 'expands when collapsed and button is clicked', async () => {
			const wrapper = shallowMount( ExpandedToggle, {
				props: {
					expanded: false, // collapsed
					hasExpandedMode: true
				},
				global: { stubs: { CdxButton: false } }
			} );

			expect( wrapper.find( '.ext-wikilambda-app-expanded-toggle__icon--collapsed' ).exists() ).toBe( true );

			wrapper.findComponent( { name: 'cdx-button' } ).trigger( 'click' );
			expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-toggle-expanded-view' );

			await waitFor( () => expect( wrapper.emitted( 'toggle' ) ).toBeTruthy() );
		} );

		it( 'collapses when expanded and button is clicked', async () => {
			const wrapper = shallowMount( ExpandedToggle, {
				props: {
					expanded: true, // expanded
					hasExpandedMode: true
				},
				global: { stubs: { CdxButton: false } }
			} );

			expect( wrapper.find( '.ext-wikilambda-app-expanded-toggle__icon--expanded' ).exists() ).toBe( true );

			wrapper.findComponent( { name: 'cdx-button' } ).trigger( 'click' );
			expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-toggle-expanded-view' );

			await waitFor( () => expect( wrapper.emitted( 'toggle' ) ).toBeTruthy() );
		} );
	} );

	describe( 'when toggle is disabled', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ExpandedToggle, {
				props: {
					expanded: false,
					hasExpandedMode: false // not togglable
				},
				global: { stubs: { CdxButton: false } }
			} );

			expect( wrapper.findComponent( { name: 'wl-expanded-toggle' } ).exists() ).toBe( true );
		} );

		it( 'shows a non-collapse/expandable button', () => {
			const wrapper = shallowMount( ExpandedToggle, {
				props: {
					expanded: false,
					hasExpandedMode: false
				},
				global: { stubs: { CdxButton: false } }
			} );

			expect( wrapper.find( '.ext-wikilambda-app-expanded-toggle__icon--disabled' ).exists() ).toBe( true );
		} );
	} );
} );
