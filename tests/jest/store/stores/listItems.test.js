/*!
 * WikiLambda unit test suite for the listItems Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { canonicalToHybrid } = require( '../../../../resources/ext.wikilambda.app/utils/schemata.js' );

describe( 'ListItems Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.invalidListItems = {};
	} );

	describe( 'Getters', () => {
		describe( 'getInvalidListItems', () => {
			it( 'returns the list items marked as invalid', () => {
				const items = {
					'main.Z2K2': [ 2, 3 ],
					'main.Z2K3.Z12K1': [ 5, 6 ]
				};
				store.invalidListItems = items;
				expect( store.getInvalidListItems ).toEqual( items );
			} );
		} );

		describe( 'hasInvalidListItems', () => {
			it( 'returns false when there are no items marked as invalid', () => {
				expect( store.hasInvalidListItems ).toBe( false );
			} );
			it( 'returns true when there are items marked as invalid', () => {
				store.invalidListItems = {
					'main.Z2K2': [ 2, 3 ],
					'main.Z2K3.Z12K1': [ 5, 6 ]
				};
				expect( store.hasInvalidListItems ).toBe( true );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'setInvalidListItems', () => {
			it( 'sets invalid items for removal', () => {
				const payload = {
					listId: 'main.Z2K2',
					listItems: [ 2, 3 ]
				};
				store.setInvalidListItems( payload );
				expect( store.invalidListItems ).toEqual( { 'main.Z2K2': [ 2, 3 ] } );
			} );
		} );

		describe( 'clearInvalidListItems', () => {
			it( 'clears invalid items for removal', () => {
				store.invalidListItems = {
					'main.Z2K2': [ 2, 3 ],
					'main.Z2K3.Z12K1': [ 5, 6 ]
				};
				store.clearInvalidListItems( 'main.Z2K2' );

				expect( store.invalidListItems[ 'main.Z2K2' ] ).toEqual( [] );
				expect( store.invalidListItems[ 'main.Z2K3.Z12K1' ] ).toEqual( [ 5, 6 ] );
			} );
		} );

		describe( 'handleListTypeChange', () => {
			it( 'does nothing if value is not a list', () => {
				store.handleListTypeChange( {
					keyPath: 'main.Z2K2',
					objectValue: [],
					newType: 'Z3'
				} );

				expect( store.invalidListItems ).toEqual( {} );
			} );

			it( 'sets a warning and marks invalid items when the new type is different and there are incompatible items', () => {
				const currentList = canonicalToHybrid( [
					'Z1',
					'one string ok',
					{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'not ok' },
					{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'also not ok' },
					'another string ok'
				] );

				store.handleListTypeChange( {
					keyPath: 'main.Z2K2',
					objectValue: currentList,
					newType: 'Z6'
				} );

				expect( store.errors.main ).toEqual( [ {
					code: 'wikilambda-list-type-change-warning',
					message: undefined,
					type: 'warning'
				} ] );

				expect( store.invalidListItems ).toEqual( {
					'main.Z2K2': [ 2, 3 ]
				} );
			} );

			it( 'clears errors and invalid items when the new type is Z1/Object', () => {
				const currentList = canonicalToHybrid( [
					'Z6',
					'one string ok',
					{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'not ok' },
					{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'also not ok' },
					'another string ok'
				] );

				store.handleListTypeChange( {
					keyPath: 'main.Z2K2',
					objectValue: currentList,
					newType: 'Z3'
				} );

				expect( store.invalidListItems ).toEqual( {
					'main.Z2K2': [ 1, 2, 3, 4 ]
				} );

				store.handleListTypeChange( {
					keyPath: 'main.Z2K2',
					objectValue: currentList,
					newType: 'Z1'
				} );

				expect( store.invalidListItems ).toEqual( { 'main.Z2K2': [] } );
			} );
		} );
	} );
} );
