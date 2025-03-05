/*!
 * WikiLambda unit test suite for the currentPage Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { canonicalToHybrid } = require( '../../../../resources/ext.wikilambda.app/utils/schemata.js' );

describe( 'CurrentPage Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();

		// Initialize the store state
		store.jsonObject = { main: {} };
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
				const inputs = [];
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
					aliases,
					inputs
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
					] },
					inputs: [
						{ Z1K1: 'Z12', Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1004', Z11K2: 'original input 1' }
						] },
						{ Z1K1: 'Z12', Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1004', Z11K2: 'original input 2' }
						] }
					]
				};
				store.setValueByKeyPath = jest.fn();
				store.multilingualDataCopy = multilingualDataCopy;
				store.jsonObject.main = canonicalToHybrid( {
					Z2K2: {
						Z1K1: 'Z8',
						Z8K1: [ 'Z17',
							{ Z1K1: 'Z17', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
							{ Z1K1: 'Z17', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
						]
					},
					Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					Z2K4: { Z1K1: 'Z32', Z32K1: [ 'Z31' ] },
					Z2K5: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
				} );

				store.resetMultilingualData();

				expect( store.setValueByKeyPath ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K3' ],
					value: canonicalToHybrid( multilingualDataCopy.names )
				} );

				expect( store.setValueByKeyPath ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K4' ],
					value: canonicalToHybrid( multilingualDataCopy.aliases )
				} );

				expect( store.setValueByKeyPath ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K5' ],
					value: canonicalToHybrid( multilingualDataCopy.descriptions )
				} );

				expect( store.setValueByKeyPath ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K2', 'Z8K1', 1, 'Z17K3' ],
					value: canonicalToHybrid( multilingualDataCopy.inputs[ 0 ] )
				} );

				expect( store.setValueByKeyPath ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K2', 'Z8K1', 2, 'Z17K3' ],
					value: canonicalToHybrid( multilingualDataCopy.inputs[ 1 ] )
				} );
			} );
		} );
	} );
} );
