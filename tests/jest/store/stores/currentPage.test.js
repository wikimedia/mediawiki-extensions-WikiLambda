/*!
 * WikiLambda unit test suite for the currentPage Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const { tableDataToRowObjects, zobjectToRows } = require( '../../helpers/zObjectTableHelpers.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'CurrentPage Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();

		// Initialize the store state
		store.zobject = [];
		store.currentZid = Constants.NEW_ZID_PLACEHOLDER;
		store.createNewPage = false;
		store.initialized = false;
		store.dirty = false;
		store.multilingualDataCopy = null;

	} );

	describe( 'Getters', () => {
		describe( 'isInitialized', () => {
			it( 'returns false when page has not been initialized', () => {
				store.initialized = false;
				expect( store.isInitialized ).toEqual( false );
			} );

			it( 'returns true when page has been initialized', () => {
				store.initialized = true;
				expect( store.isInitialized ).toEqual( true );
			} );
		} );

		describe( 'isDirty', () => {
			it( 'returns true when page has unsaved edits', () => {
				store.dirty = true;
				expect( store.isDirty ).toEqual( true );
			} );

			it( 'returns false when page has no unsaved edits', () => {
				store.dirty = false;
				expect( store.isDirty ).toEqual( false );
			} );
		} );

		describe( 'isCreateNewPage', () => {
			it( 'Returns the default value of createNewPage', () => {
				expect( store.isCreateNewPage ).toBe( false );
			} );

			it( 'Returns the createNewPage value', () => {
				store.createNewPage = true;
				expect( store.isCreateNewPage ).toBe( true );
			} );
		} );

		describe( 'isMainObject', () => {

			it( 'returns false if rowId does not exist', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, parent: undefined, key: 'foo', value: 'bar' }
				] );
				expect( store.isMainObject( 1 ) ).toBe( false );
			} );

			it( 'returns true if rowId is the main oldest ancestor', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, parent: undefined, key: 'foo', value: 'bar' }
				] );

				expect( store.isMainObject( 0 ) ).toBe( true );
			} );

			it( 'returns false if rowId is a detached oldest ancestor', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, parent: undefined, key: 'foo', value: 'bar' },
					{ id: 2, parent: undefined, key: 'foo', value: 'bar' }
				] );

				expect( store.isMainObject( 2 ) ).toBe( false );
			} );

			it( 'returns true if rowId is child of the main oldest ancestor', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, parent: undefined, key: 'foo', value: 'bar' },
					{ id: 1, parent: 0, key: 'foo', value: 'bar' },
					{ id: 2, parent: 1, key: 'foo', value: 'bar' }
				] );

				expect( store.isMainObject( 2 ) ).toBe( true );
			} );

			it( 'returns false if rowId is child of a detached oldest ancestor', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, parent: undefined, key: 'foo', value: 'bar' },
					{ id: 1, parent: 0, key: 'foo', value: 'bar' },
					{ id: 2, parent: undefined, key: 'foo', value: 'bar' },
					{ id: 3, parent: 2, key: 'foo', value: 'bar' },
					{ id: 4, parent: 3, key: 'foo', value: 'bar' }
				] );

				expect( store.isMainObject( 4 ) ).toBe( false );
			} );
		} );

		describe( 'getCurrentZObjectId', () => {
			it( 'returns current persisted Zid being edited or viewed', () => {
				store.currentZid = 'Z10001';
				expect( store.getCurrentZObjectId ).toEqual( 'Z10001' );
			} );

			it( 'returns null Zid (Z0) if new page', () => {
				store.currentZid = undefined;
				expect( store.getCurrentZObjectId ).toEqual( 'Z0' );
			} );
		} );

		describe( 'getCurrentZObjectType', () => {
			it( 'returns the type of the persisted content', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z1K1: 'Z6' } } );

				// Mock the getters
				Object.defineProperty( store, 'getZObjectTypeByRowId', {
					value: jest.fn()
				} );
				Object.defineProperty( store, 'getZPersistentContentRowId', {
					value: jest.fn().mockReturnValue( 1 )
				} );

				expect( store.getCurrentZObjectType ).toEqual( undefined );
				expect( store.getZPersistentContentRowId ).toHaveBeenCalled();
				expect( store.getZObjectTypeByRowId ).toHaveBeenCalledWith( 1 );
			} );
		} );

		describe( 'getCurrentZImplementationType', () => {
			it( 'returns the implementation type of the persisted content', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z1K1: 'Z6' } } );
				Object.defineProperty( store, 'getZImplementationContentType', {
					value: jest.fn()
				} );
				Object.defineProperty( store, 'getZPersistentContentRowId', {
					value: jest.fn().mockReturnValue( 1 )
				} );
				expect( store.getCurrentZImplementationType ).toEqual( undefined );
				expect( store.getZPersistentContentRowId ).toHaveBeenCalled();
				expect( store.getZImplementationContentType ).toHaveBeenCalledWith( 1 );
			} );
		} );

		describe( 'getMultilingualDataCopy', () => {
			it( 'returns the multilingual data copy', () => {
				const multilingualDataCopy = {
					names: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					aliases: { Z1K1: 'Z32', Z12K1: [ 'Z31' ] },
					descriptions: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
				};
				store.multilingualDataCopy = multilingualDataCopy;
				expect( store.getMultilingualDataCopy ).toEqual( multilingualDataCopy );
			} );
		} );
	} );

	describe( 'Actions', () => {

		describe( 'setDirty', () => {
			it( 'Sets dirty to true', () => {
				store.dirty = false;
				store.setDirty();
				expect( store.dirty ).toBe( true );
			} );

			it( 'Sets dirty to false', () => {
				store.dirty = true;
				store.setDirty( false );
				expect( store.dirty ).toBe( false );
			} );
		} );

		describe( 'setInitialized', () => {
			it( 'sets initialized to true', () => {
				expect( store.initialized ).toBe( false );
				store.setInitialized( true );
				expect( store.initialized ).toBe( true );
			} );
		} );

		describe( 'setCreateNewPage', () => {
			it( 'sets createNewPage to provided value', () => {
				expect( store.createNewPage ).toBe( false );
				store.setCreateNewPage( true );
				expect( store.createNewPage ).toBe( true );
			} );
		} );

		describe( 'setCurrentZid', () => {
			it( 'sets currentZid to provided value', () => {
				expect( store.currentZid ).toBe( 'Z0' );
				store.setCurrentZid( 'Z10000' );
				expect( store.currentZid ).toBe( 'Z10000' );
			} );
		} );

		describe( 'saveMultilingualDataCopy', () => {
			it( 'saves all multilingual fields', () => {
				const names = {
					Z1K1: 'Z12',
					Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' }
					]
				};
				const aliases = {
					Z1K1: 'Z32',
					Z32K1: [ 'Z31',
						{ Z1K1: 'Z1', Z31K1: 'Z1002', Z31K2: [ 'Z6', 'alias' ] }
					]
				};
				const descriptions = {
					Z1K1: 'Z12',
					Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'description' }
					]
				};
				const zobject = {
					Z1K1: 'Z2',
					Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
					Z2K2: 'test',
					Z2K3: names,
					Z2K4: aliases,
					Z2K5: descriptions
				};

				expect( store.multilingualDataCopy ).toEqual( null );
				store.saveMultilingualDataCopy( zobject );
				expect( store.multilingualDataCopy ).toEqual( {
					names,
					descriptions,
					aliases
				} );
			} );
		} );

		describe( 'resetMultilingualData', () => {
			it( 'resets the multilingual data of the current object to the saved copy', () => {
				const multilingualDataCopy = {
					names: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'original name' }
					] },
					aliases: { Z1K1: 'Z32', Z12K1: [ 'Z31',
						{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'original alias' ] }
					] },
					descriptions: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1004', Z11K2: 'original description' }
					] }
				};
				store.injectZObjectFromRowId = jest.fn();
				store.multilingualDataCopy = multilingualDataCopy;
				store.zobject = zobjectToRows( {
					Z2K3: { // rowId 1
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ]
					},
					Z2K4: { // rowId 9
						Z1K1: 'Z32',
						Z32K1: [ 'Z31' ]
					},
					Z2K5: { // rowId 17
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ]
					}
				} );

				store.resetMultilingualData();

				expect( store.injectZObjectFromRowId ).toHaveBeenCalledWith( {
					rowId: 1,
					value: multilingualDataCopy.names
				} );

				expect( store.injectZObjectFromRowId ).toHaveBeenCalledWith( {
					rowId: 9,
					value: multilingualDataCopy.aliases
				} );

				expect( store.injectZObjectFromRowId ).toHaveBeenCalledWith( {
					rowId: 17,
					value: multilingualDataCopy.descriptions
				} );
			} );
		} );
	} );
} );
