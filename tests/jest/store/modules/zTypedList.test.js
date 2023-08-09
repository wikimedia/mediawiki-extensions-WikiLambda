/*!
 * WikiLambda unit test suite for the zTypedList Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const zTypedListModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zTypedList.js' );

describe( 'zTypedList Vuex module', () => {

	describe( 'Getters', () => {
		describe( 'hasInvalidListItems', () => {
			it( 'returns false when there are no items marked as invalid', () => {
				state.invalidListItems = {};
				expect( zTypedListModule.getters.hasInvalidListItems( state ) ).toBe( false );
			} );
			it( 'returns true when there are items marked as invalid', () => {
				state.invalidListItems = {
					1: [ 2, 3 ],
					4: [ 5, 6 ]
				};
				expect( zTypedListModule.getters.hasInvalidListItems( state ) ).toBe( true );
			} );
		} );

		describe( 'getInvalidListItems', () => {
			it( 'returns the list items marked as invalid', () => {
				const items = {
					1: [ 2, 3 ],
					4: [ 5, 6 ]
				};
				state.invalidListItems = items;
				expect( zTypedListModule.getters.getInvalidListItems( state ) ).toEqual( items );
			} );
		} );
	} );

	describe( 'Mutations', () => {
		describe( 'setInvalidListItems', () => {
			it( 'sets invalid items for removal', () => {
				state.invalidListItems = {};
				const payload = {
					parentRowId: 1,
					listItems: [ 2, 3 ]
				};
				zTypedListModule.mutations.setInvalidListItems( state, payload );
				expect( state.invalidListItems ).toEqual( { 1: [ 2, 3 ] } );
			} );
		} );

		describe( 'clearInvalidListItems', () => {
			it( 'clears invalid items for removal', () => {
				state.invalidListItems = {
					1: [ 2, 3 ],
					4: [ 5, 6 ]
				};
				zTypedListModule.mutations.clearInvalidListItems( state );
				expect( state.invalidListItems ).toEqual( {} );
			} );
		} );
	} );

	describe( 'Actions', () => {
		const context = {};

		beforeEach( () => {
			context.commit = jest.fn();
		} );

		describe( 'setListItemsForRemoval', () => {
			it( 'sets items for removal', () => {
				const payload = {
					parentRowId: 1,
					listItems: [ 2, 3 ]
				};
				zTypedListModule.actions.setListItemsForRemoval( context, payload );
				expect( context.commit ).toHaveBeenCalledWith( 'setInvalidListItems', payload );
			} );
		} );

		describe( 'clearListItemsForRemoval', () => {
			it( 'clears items for removal', () => {
				zTypedListModule.actions.clearListItemsForRemoval( context );
				expect( context.commit ).toHaveBeenCalledWith( 'clearInvalidListItems' );
			} );
		} );
	} );
} );
