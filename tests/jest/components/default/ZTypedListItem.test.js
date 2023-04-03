/*!
 * WikiLambda unit test suite for the default ZTypedListItem component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZTypedListItem = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZTypedListItem.vue' );

describe( 'ZTypedListItem', () => {
	var getters;

	beforeEach( () => {
		getters = {
			getZObjectTypeByRowId: createGettersWithFunctionsMock( 'Z6' )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );

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
					edit: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-ztyped-list-item-bullet' ).exists() ).toBe( true );
		} );

		it( 'does not render bullet points for non-terminal list items', () => {
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z11' );
			global.store.hotUpdate( { getters: getters } );
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
					edit: true
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-ztyped-list-item-bullet' ).exists() ).toBe( false );
		} );
	} );
} );
