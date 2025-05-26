/*!
 * WikiLambda unit test suite for the listItems Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'ListItems Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.invalidListItems = {};
	} );

	describe( 'Getters', () => {
		describe( 'hasInvalidListItems', () => {
			it( 'returns false when there are no items marked as invalid', () => {
				expect( store.hasInvalidListItems ).toBe( false );
			} );
			it( 'returns true when there are items marked as invalid', () => {
				store.invalidListItems = {
					1: [ 2, 3 ],
					4: [ 5, 6 ]
				};
				expect( store.hasInvalidListItems ).toBe( true );
			} );
		} );

		describe( 'getInvalidListItems', () => {
			it( 'returns the list items marked as invalid', () => {
				const items = {
					1: [ 2, 3 ],
					4: [ 5, 6 ]
				};
				store.invalidListItems = items;
				expect( store.getInvalidListItems ).toEqual( items );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'setInvalidListItems', () => {
			it( 'sets invalid items for removal', () => {
				const payload = {
					parentRowId: 1,
					listItems: [ 2, 3 ]
				};
				store.setInvalidListItems( payload );
				expect( store.invalidListItems ).toEqual( { 1: [ 2, 3 ] } );
			} );
		} );

		describe( 'clearInvalidListItems', () => {
			it( 'clears invalid items for removal', () => {
				store.invalidListItems = {
					1: [ 2, 3 ],
					4: [ 5, 6 ]
				};
				store.clearInvalidListItems();
				expect( store.invalidListItems ).toEqual( {} );
			} );
		} );

		describe( 'handleListTypeChange', () => {
			beforeEach( () => {
				Object.defineProperty( store, 'getTypedListItemsRowIds', {
					value: jest.fn().mockReturnValue( [ 1, 2, 3 ] )
				} );
				Object.defineProperty( store, 'getZObjectTypeByRowId', {
					value: jest.fn( ( rowId ) => rowId === 1 ? 'Z3' : 'Z2' )
				} );
			} );

			it( 'sets a warning and marks invalid items when the new type is different and there are incompatible items', () => {
				store.handleListTypeChange( {
					parentRowId: 0,
					newListItemType: 'Z3'
				} );

				expect( store.errors[ 0 ] ).toEqual( [ {
					code: 'wikilambda-list-type-change-warning',
					message: undefined,
					type: 'warning'
				} ] );

				expect( store.invalidListItems ).toEqual( {
					0: [ 2, 3 ]
				} );
			} );

			it( 'clears errors and invalid items when the new type is Z1/Object', () => {
				store.handleListTypeChange( {
					parentRowId: 0,
					newListItemType: 'Z3'
				} );

				expect( store.invalidListItems ).toEqual( {
					0: [ 2, 3 ]
				} );

				store.handleListTypeChange( {
					parentRowId: 0,
					newListItemType: 'Z1'
				} );

				expect( store.invalidListItems ).toEqual( {} );
			} );

			it( 'does nothing if there are no list items', () => {
				Object.defineProperty( store, 'getTypedListItemsRowIds', {
					value: jest.fn().mockReturnValue( [ ] )
				} );

				store.handleListTypeChange( {
					parentRowId: 0,
					newListItemType: 'Z3'
				} );

				expect( store.invalidListItems ).toEqual( {} );
			} );
		} );
	} );
} );
