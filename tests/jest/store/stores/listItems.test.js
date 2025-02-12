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
	} );
} );
