/*!
 * WikiLambda unit test suite for the currentPage Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const tableDataToRowObjects = require( '../../helpers/zObjectTableHelpers.js' ).tableDataToRowObjects,
	Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	zobjectToRows = require( '../../helpers/zObjectTableHelpers.js' ).zobjectToRows,
	zobjectModule = require( '../../../../resources/ext.wikilambda.app/store/modules/zobject.js' );

let state,
	getters,
	context;

describe( 'currentPage Vuex module', () => {
	const currentPageModule = zobjectModule.modules.currentPage;

	beforeEach( () => {
		state = {
			zobject: [],
			currentZid: Constants.NEW_ZID_PLACEHOLDER,
			createNewPage: false,
			initialized: false,
			dirty: false,
			multilingualDataCopy: null
		};
		context = {
			commit: jest.fn(),
			dispatch: jest.fn(),
			getters: {}
		};
	} );

	describe( 'Getters', () => {
		describe( 'isInitialized', () => {
			it( 'returns false when page has not been initialized', () => {
				state.initialized = false;
				expect( currentPageModule.getters.isInitialized( state ) ).toEqual( false );
			} );

			it( 'returns true when page has not been initialized', () => {
				state.initialized = true;
				expect( currentPageModule.getters.isInitialized( state ) ).toEqual( true );
			} );
		} );

		describe( 'isDirty', () => {
			it( 'returns true when page has unsaved edits', () => {
				state.dirty = true;
				expect( currentPageModule.getters.isDirty( state ) ).toEqual( true );
			} );

			it( 'returns false when page has no unsaved edits', () => {
				state.dirty = false;
				expect( currentPageModule.getters.isDirty( state ) ).toEqual( false );
			} );
		} );

		describe( 'isCreateNewPage', () => {
			it( 'Returns the default value of createNewPage', () => {
				expect( currentPageModule.getters.isCreateNewPage( state ) ).toBe( false );
			} );

			it( 'Returns the createNewPage value', () => {
				state.createNewPage = true;
				expect( currentPageModule.getters.isCreateNewPage( state ) ).toBe( true );
			} );
		} );

		describe( 'isMainObject', () => {
			beforeEach( () => {
				getters = {
					getRowById: zobjectModule.getters.getRowById( state )
				};
			} );

			it( 'returns false if rowId does not exist', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, parent: undefined, key: 'foo', value: 'bar' }
				] );
				expect( currentPageModule.getters.isMainObject( state, getters )( 1 ) ).toBe( false );
			} );

			it( 'return true if rowId is the main oldest ancestor', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, parent: undefined, key: 'foo', value: 'bar' }
				] );
				expect( currentPageModule.getters.isMainObject( state, getters )( 0 ) ).toBe( true );
			} );

			it( 'return false if rowId is a detached oldest ancestor', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, parent: undefined, key: 'foo', value: 'bar' },
					{ id: 2, parent: undefined, key: 'foo', value: 'bar' }
				] );
				expect( currentPageModule.getters.isMainObject( state, getters )( 2 ) ).toBe( false );
			} );

			it( 'return true if rowId is child of the main oldest ancestor', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, parent: undefined, key: 'foo', value: 'bar' },
					{ id: 1, parent: 0, key: 'foo', value: 'bar' },
					{ id: 2, parent: 1, key: 'foo', value: 'bar' }
				] );
				expect( currentPageModule.getters.isMainObject( state, getters )( 2 ) ).toBe( true );
			} );

			it( 'return false if rowId is child of a detached oldest ancestor', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, parent: undefined, key: 'foo', value: 'bar' },
					{ id: 1, parent: 0, key: 'foo', value: 'bar' },
					{ id: 2, parent: undefined, key: 'foo', value: 'bar' },
					{ id: 3, parent: 2, key: 'foo', value: 'bar' },
					{ id: 4, parent: 3, key: 'foo', value: 'bar' }
				] );
				expect( currentPageModule.getters.isMainObject( state, getters )( 4 ) ).toBe( false );
			} );
		} );

		describe( 'getCurrentZObjectId', () => {
			it( 'returns current persisted Zid being edited or viewed', () => {
				state.currentZid = 'Z10001';
				expect( currentPageModule.getters.getCurrentZObjectId( state ) ).toEqual( 'Z10001' );
			} );

			it( 'returns null Zid (Z0) if new page', () => {
				state.currentZid = undefined;
				expect( currentPageModule.getters.getCurrentZObjectId( state ) ).toEqual( 'Z0' );
			} );
		} );

		describe( 'getCurrentZObjectType', () => {
			it( 'returns the type of the persisted content', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z1K1: 'Z6' } } );
				getters = {};
				getters.getZObjectTypeByRowId = jest.fn();
				getters.getZPersistentContentRowId = jest.fn( () => 1 );

				currentPageModule.getters.getCurrentZObjectType( state, getters );

				expect( getters.getZObjectTypeByRowId ).toHaveBeenCalledWith( 1 );
			} );
		} );

		describe( 'getCurrentZImplementationType', () => {
			it( 'returns the implementation type of the persisted content', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z1K1: 'Z6' } } );
				getters = {};
				getters.getZImplementationContentType = jest.fn();
				getters.getZPersistentContentRowId = jest.fn( () => 1 );

				currentPageModule.getters.getCurrentZImplementationType( state, getters );

				expect( getters.getZImplementationContentType ).toHaveBeenCalledWith( 1 );
			} );
		} );

		describe( 'getMultilingualDataCopy', () => {
			it( 'returns the multilingual data copy', () => {
				const multilingualDataCopy = {
					names: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					aliases: { Z1K1: 'Z32', Z12K1: [ 'Z31' ] },
					descriptions: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
				};
				state.multilingualDataCopy = multilingualDataCopy;
				expect( currentPageModule.getters.getMultilingualDataCopy( state ) )
					.toEqual( multilingualDataCopy );
			} );
		} );
	} );

	describe( 'Mutations', () => {
		beforeEach( () => {
			// Initialize to module state to test default values
			state = currentPageModule.state;
		} );

		describe( 'setInitialized', () => {
			it( 'sets initialized to true', () => {
				expect( state.initialized ).toBe( false );
				currentPageModule.mutations.setInitialized( state, true );
				expect( state.initialized ).toBe( true );
			} );
		} );

		describe( 'setCreateNewPage', () => {
			it( 'sets createNewPage to provided value', () => {
				expect( state.createNewPage ).toBe( false );
				currentPageModule.mutations.setCreateNewPage( state, true );
				expect( state.createNewPage ).toBe( true );
			} );
		} );

		describe( 'setCurrentZid', () => {
			it( 'sets currentZid to provided value', () => {
				expect( state.currentZid ).toBe( 'Z0' );
				currentPageModule.mutations.setCurrentZid( state, 'Z10000' );
				expect( state.currentZid ).toBe( 'Z10000' );
			} );
		} );

		describe( 'setDirty', () => {
			it( 'sets dirty to provided value', () => {
				expect( state.dirty ).toBe( false );
				currentPageModule.mutations.setDirty( state, true );
				expect( state.dirty ).toBe( true );
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

				expect( state.multilingualDataCopy ).toEqual( null );
				currentPageModule.mutations.saveMultilingualDataCopy( state, zobject );
				expect( state.multilingualDataCopy ).toEqual( {
					names,
					descriptions,
					aliases
				} );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'setDirty', () => {
			it( 'Sets dirty to true', () => {
				context.state = {
					dirty: false
				};
				currentPageModule.actions.setDirty( context );
				expect( context.commit ).toHaveBeenCalledWith( 'setDirty', true );
			} );

			it( 'Sets dirty to false', () => {
				context.state = {
					dirty: false
				};
				currentPageModule.actions.setDirty( context, false );
				expect( context.commit ).toHaveBeenCalledWith( 'setDirty', false );
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

				context.state = {
					multilingualDataCopy: multilingualDataCopy,
					zobject: zobjectToRows( {
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
					} )
				};

				context.getters = {};
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state, context.getters );
				context.getters.getMultilingualDataCopy = currentPageModule.getters.getMultilingualDataCopy( context.state );

				currentPageModule.actions.resetMultilingualData( context );

				expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', {
					rowId: 1,
					value: multilingualDataCopy.names
				} );

				expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', {
					rowId: 9,
					value: multilingualDataCopy.aliases
				} );

				expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', {
					rowId: 17,
					value: multilingualDataCopy.descriptions
				} );
			} );
		} );
	} );
} );
