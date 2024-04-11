/*!
 * WikiLambda unit test suite for the default Pagination component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	{ waitFor } = require( '@testing-library/vue' ),
	Pagination = require( '../../../../resources/ext.wikilambda.edit/components/base/Pagination.vue' );

describe( 'Pagination', () => {
	describe( 'when using pagination button', () => {
		describe( 'when more than one page', () => {
			it( 'renders without errors', () => {
				const wrapper = shallowMount( Pagination, {
					props: {
						totalPages: 5
					}
				} );

				expect( wrapper.find( '.ext-wikilambda-pagination' ).exists() ).toBe( true );
			} );

			it( 'allows click to next page', async () => {
				const wrapper = shallowMount( Pagination, {
					props: {
						currentPage: 1,
						totalPages: 5
					},
					global: { stubs: { CdxIcon: false } }
				} );

				const paginatedButtons = wrapper.findAll( '.ext-wikilambda-pagination__page-selector__action' );
				expect( paginatedButtons.length ).toBe( 2 );
				const backButton = paginatedButtons[ 0 ];
				expect( backButton.attributes( 'disabled' ) ).toBe( 'true' );
				const nextButton = paginatedButtons[ 1 ];
				expect( nextButton.attributes( 'disabled' ) ).toBe( 'false' );

				nextButton.trigger( 'click' );
				await waitFor( () => expect( wrapper.emitted( 'update-page' ) ).toBeTruthy() );
			} );

			it( 'allows click to previous page', async () => {
				const wrapper = shallowMount( Pagination, {
					props: {
						currentPage: 3,
						totalPages: 5
					},
					global: { stubs: { CdxIcon: false } }
				} );

				const paginatedButtons = wrapper.findAll( '.ext-wikilambda-pagination__page-selector__action' );
				expect( paginatedButtons.length ).toBe( 2 );
				const backButton = paginatedButtons[ 0 ];
				expect( backButton.attributes( 'disabled' ) ).toBe( 'false' );
				const nextButton = paginatedButtons[ 1 ];
				expect( nextButton.attributes( 'disabled' ) ).toBe( 'false' );

				backButton.trigger( 'click' );
				await waitFor( () => expect( wrapper.emitted( 'update-page' ) ).toBeTruthy() );
			} );
		} );

		describe( 'when only one page', () => {
			it( 'renders without errors', () => {
				const wrapper = shallowMount( Pagination, {
					props: {
						totalPages: 1
					}
				} );

				expect( wrapper.find( '.ext-wikilambda-pagination' ).exists() ).toBe( true );
			} );

			it( 'shows a button with click disabled', () => {
				const wrapper = shallowMount( Pagination, {
					props: {
						totalPages: 1
					},
					global: { stubs: { CdxIcon: false } }
				} );

				const paginatedButtons = wrapper.findAll( '.ext-wikilambda-pagination__page-selector__action' );
				expect( paginatedButtons.length ).toBe( 2 );
				const backButton = paginatedButtons[ 0 ];
				expect( backButton.attributes( 'disabled' ) ).toBe( 'true' );
				const nextButton = paginatedButtons[ 1 ];
				expect( nextButton.attributes( 'disabled' ) ).toBe( 'true' );
			} );
		} );
	} );

	describe( 'when using view all button', () => {
		describe( 'when clicking button to view all', () => {
			it( 'shows more of the functions', async () => {
				const wrapper = shallowMount( Pagination, {
					props: {
						totalPages: 3,
						showingAll: false
					},
					global: { stubs: { CdxButton: false } }
				} );

				const viewButton = wrapper.find( '.ext-wikilambda-pagination__view-all' );
				expect( viewButton.text() ).toBe( 'View all' );

				viewButton.trigger( 'click' );
				await waitFor( () => expect( wrapper.emitted( 'reset-view' ) ).toBeTruthy() );
			} );

		} );

		describe( 'when clicking button to view less', () => {
			it( 'shows less of the functions', async () => {
				const wrapper = shallowMount( Pagination, {
					props: {
						totalPages: 3,
						showingAll: true
					},
					global: { stubs: { CdxButton: false } }
				} );

				const viewButton = wrapper.find( '.ext-wikilambda-pagination__view-all' );
				expect( viewButton.text() ).toBe( 'View less' );

				viewButton.trigger( 'click' );
				await waitFor( () => expect( wrapper.emitted( 'reset-view' ) ).toBeTruthy() );
			} );
		} );
	} );
} );
