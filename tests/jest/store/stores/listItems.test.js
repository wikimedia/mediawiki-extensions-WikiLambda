/*!
 * WikiLambda unit test suite for the listItems module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { canonicalToHybrid } = require( '../../../../resources/ext.wikilambda.app/utils/schemata.js' );

// Z1002 is a language, Z1004 is not fetched
const storedObjects = {
	Z1002: {
		success: true,
		data: { Z1K1: 'Z2', Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1002' }, Z2K2: { Z1K1: 'Z60', Z60K1: 'en' } }
	}
};

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

		describe( 'isInvalidListItem', () => {
			const monolingual = canonicalToHybrid( { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'not a string' } );

			it( 'returns false when the item matches the item type of the list', () => {
				expect( store.isInvalidListItem( canonicalToHybrid( 'a string' ), 'Z6' ) ).toBe( false );
			} );

			it( 'returns true when the item does not match the item type of the list', () => {
				expect( store.isInvalidListItem( monolingual, 'Z6' ) ).toBe( true );
			} );

			it( 'returns false for any item of a list of Z1/Object', () => {
				expect( store.isInvalidListItem( monolingual, 'Z1' ) ).toBe( false );
			} );

			describe( 'with a reference', () => {
				const reference = canonicalToHybrid( 'Z1002' );

				beforeEach( () => {
					store.objects = storedObjects;
				} );

				it( 'returns false when the referred object has the item type of the list', () => {
					expect( store.isInvalidListItem( reference, 'Z60' ) ).toBe( false );
				} );

				it( 'returns true when the referred object has another type', () => {
					expect( store.isInvalidListItem( reference, 'Z6' ) ).toBe( true );
				} );

				it( 'returns false for a list of references', () => {
					expect( store.isInvalidListItem( reference, 'Z9' ) ).toBe( false );
				} );

				it( 'returns false when the referred object is not fetched yet', () => {
					expect( store.isInvalidListItem( canonicalToHybrid( 'Z1004' ), 'Z6' ) ).toBe( false );
				} );
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

				expect( store.invalidListItems ).toEqual( { 'main.Z2K3.Z12K1': [ 5, 6 ] } );
				expect( store.hasInvalidListItems ).toBe( true );

				store.clearInvalidListItems( 'main.Z2K3.Z12K1' );
				expect( store.hasInvalidListItems ).toBe( false );
			} );
		} );

		describe( 'relocateInvalidListItems', () => {
			beforeEach( () => {
				store.invalidListItems = {
					'main.Z2K2': [ 1, 3 ],
					'main.Z2K2.1.Z12K1': [ 1 ],
					'main.Z2K2.3.Z12K1': [ 2 ],
					'main.Z2K22': [ 1 ]
				};
			} );

			it( 'updates the indexes of the list and the key paths of the lists inside its items', () => {
				// The item at index 1 was deleted
				store.relocateInvalidListItems( [ 'main', 'Z2K2' ], ( index ) => index === 1 ? -1 : index - 1 );

				expect( store.invalidListItems ).toEqual( {
					'main.Z2K2': [ 2 ],
					'main.Z2K2.2.Z12K1': [ 2 ],
					'main.Z2K22': [ 1 ]
				} );
			} );

			it( 'only updates the lists inside the items of the given list', () => {
				store.relocateInvalidListItems( [ 'main', 'Z2K2', '1', 'Z12K1' ], ( index ) => index + 1 );

				expect( store.invalidListItems ).toEqual( {
					'main.Z2K2': [ 1, 3 ],
					'main.Z2K2.1.Z12K1': [ 2 ],
					'main.Z2K2.3.Z12K1': [ 2 ],
					'main.Z2K22': [ 1 ]
				} );
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
					messageKey: 'wikilambda-list-type-change-warning',
					params: [],
					message: null,
					type: 'warning',
					isPermanent: false
				} ] );

				expect( store.invalidListItems ).toEqual( {
					'main.Z2K2': [ 2, 3 ]
				} );
			} );

			it( 'keeps references to objects of the new type, and to objects not fetched yet', () => {
				store.objects = storedObjects;
				const currentList = canonicalToHybrid( [ 'Z1', 'Z1002', 'Z1004', 'not a language' ] );

				store.handleListTypeChange( {
					keyPath: 'main.Z2K2',
					objectValue: currentList,
					newType: 'Z60'
				} );

				expect( store.invalidListItems ).toEqual( {
					'main.Z2K2': [ 3 ]
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

				expect( store.invalidListItems ).toEqual( {} );
			} );
		} );
	} );
} );
