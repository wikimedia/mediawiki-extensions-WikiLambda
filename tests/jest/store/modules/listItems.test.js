/*!
 * WikiLambda unit test suite for the listItems Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const listItemsModule = require( '../../../../resources/ext.wikilambda.app/store/modules/listItems.js' );

describe( 'listItems Vuex module', () => {

	describe( 'Getters', () => {
		describe( 'hasInvalidListItems', () => {
			it( 'returns false when there are no items marked as invalid', () => {
				state.invalidListItems = {};
				expect( listItemsModule.getters.hasInvalidListItems( state ) ).toBe( false );
			} );
			it( 'returns true when there are items marked as invalid', () => {
				state.invalidListItems = {
					1: [ 2, 3 ],
					4: [ 5, 6 ]
				};
				expect( listItemsModule.getters.hasInvalidListItems( state ) ).toBe( true );
			} );
		} );

		describe( 'getInvalidListItems', () => {
			it( 'returns the list items marked as invalid', () => {
				const items = {
					1: [ 2, 3 ],
					4: [ 5, 6 ]
				};
				state.invalidListItems = items;
				expect( listItemsModule.getters.getInvalidListItems( state ) ).toEqual( items );
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
				listItemsModule.mutations.setInvalidListItems( state, payload );
				expect( state.invalidListItems ).toEqual( { 1: [ 2, 3 ] } );
			} );
		} );

		describe( 'clearInvalidListItems', () => {
			it( 'clears invalid items for removal', () => {
				state.invalidListItems = {
					1: [ 2, 3 ],
					4: [ 5, 6 ]
				};
				listItemsModule.mutations.clearInvalidListItems( state );
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
				listItemsModule.actions.setListItemsForRemoval( context, payload );
				expect( context.commit ).toHaveBeenCalledWith( 'setInvalidListItems', payload );
			} );
		} );

		describe( 'clearListItemsForRemoval', () => {
			it( 'clears items for removal', () => {
				listItemsModule.actions.clearListItemsForRemoval( context );
				expect( context.commit ).toHaveBeenCalledWith( 'clearInvalidListItems' );
			} );
		} );
	} );
} );
