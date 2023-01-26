/*!
 * WikiLambda unit test suite for the default ZTypedListItem component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	ZTypedListItem = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZTypedListItem.vue' );

describe( 'ZTypedListItem', () => {
	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZTypedListItem, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-ztyped-list-item' ).exists() ).toBe( true );
		} );

		it( 'renders bullet points for terminal list items', () => {
			var wrapper = shallowMount( ZTypedListItem, {
				props: {
					edit: false,
					isTerminalItem: true
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-ztyped-list-item-bullet' ).exists() ).toBe( true );
		} );

		it( 'does not render bullet points for non-terminal list items', () => {
			var wrapper = shallowMount( ZTypedListItem, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-ztyped-list-item-bullet' ).exists() ).toBe( false );
		} );

	} );
	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZTypedListItem, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-ztyped-list-item' ).exists() ).toBe( true );
		} );

		it( 'does not render bullet points for a terminal item', () => {
			var wrapper = shallowMount( ZTypedListItem, {
				props: {
					edit: true,
					isTerminalItem: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-ztyped-list-item-bullet' ).exists() ).toBe( false );
		} );
	} );
} );
