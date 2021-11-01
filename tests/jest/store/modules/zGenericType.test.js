/* eslint-disable compat/compat */
/*!
 * WikiLambda unit test suite for the zGenericType Vuex module
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var zGenericTypeModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zGenericType.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	context;

describe( 'zGenericType Vuex module', function () {
	beforeEach( function () {
		context = $.extend( {}, {
			commit: jest.fn(),
			getters: {
				getNestedZObjectById: jest.fn().mockReturnValue( {
					value: 'dummy'
				} )
			},
			dispatch: jest.fn(),
			rootState: {
				zobjectModule: {
					zobject: []
				}
			}
		} );
	} );

	describe( 'Actions', function () {
		describe( 'addGenericTypeItem', function () {

			it( 'set new item parent id equal to root if list has no items', function () {
				var payload = {
					id: 1,
					zObjectChildren: []
				};
				zGenericTypeModule.actions.addGenericTypeItem( context, payload );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 0 ][ 0 ] ).toBe( 'addZObject' );
				expect( context.dispatch.mock.calls[ 0 ][ 1 ].parent ).toBe( payload.id );
			} );

			it( 'set new item parent id equal to last k2 parent entry', function () {
				var expectedParent = 15,
					payload = {
						id: 1,
						zObjectChildren: [
							{ key: 'K2', id: 5 },
							{ key: 'dummy', id: 10 },
							{ key: 'K2', id: expectedParent }
						]
					};
				zGenericTypeModule.actions.addGenericTypeItem( context, payload );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 0 ][ 0 ] ).toBe( 'addZObject' );
				expect( context.dispatch.mock.calls[ 0 ][ 1 ].parent ).toBe( expectedParent );
			} );

			it( 'add a Z_LIST_GENERIC_ELEMENT', function () {
				var payload = {
					id: 1,
					zObjectChildren: []
				};
				zGenericTypeModule.actions.addGenericTypeItem( context, payload );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 0 ][ 0 ] ).toBe( 'addZObject' );
				expect( context.dispatch.mock.calls[ 0 ][ 1 ].key ).toBe( Constants.Z_LIST_GENERIC_ELEMENT );
			} );

			it( 'set type of Z_LIST_GENERIC_ELEMENT to current list type', function () {
				var payload = {
						id: 1,
						zObjectChildren: []
					},
					dummyType = 'dummyType';
				context.getters.getNestedZObjectById.mockReturnValueOnce( {
					value: dummyType
				} );
				zGenericTypeModule.actions.addGenericTypeItem( context, payload );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 1 ][ 0 ] ).toBe( 'changeType' );
				expect( context.dispatch.mock.calls[ 1 ][ 1 ].type ).toBe( dummyType );
			} );

			it( 'add a Z_LIST_GENERIC_NESTED_LIST', function () {
				var payload = {
						id: 1,
						zObjectChildren: []
					},
					dummyType = 'dummyType';
				context.getters.getNestedZObjectById.mockReturnValueOnce( {
					value: dummyType
				} );
				zGenericTypeModule.actions.addGenericTypeItem( context, payload );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 2 ][ 0 ] ).toBe( 'addZObject' );
				expect( context.dispatch.mock.calls[ 2 ][ 1 ].key ).toBe( Constants.Z_LIST_GENERIC_NESTED_LIST );
			} );

			it( 'call zLstGeneric with the current list type', function () {
				var payload = {
						id: 1,
						zObjectChildren: []
					},
					dummyType = 'dummyType';
				context.getters.getNestedZObjectById.mockReturnValueOnce( {
					value: dummyType
				} );
				zGenericTypeModule.actions.addGenericTypeItem( context, payload );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 3 ][ 0 ] ).toBe( 'addZListGeneric' );
				expect( context.dispatch.mock.calls[ 3 ][ 1 ].value ).toBe( dummyType );
			} );
		} );

		describe( 'setTypeOfGenericType', function () {
			it( 'update current list generic type', function () {
				var payload = {
					type: 'testValue'
				};

				zGenericTypeModule.actions.setTypeOfGenericType( context, payload );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 0 ][ 0 ] ).toBe( 'setZObjectValue' );
				expect( context.dispatch.mock.calls[ 0 ][ 1 ].value ).toBe( payload.type );
			} );
		} );

		describe( 'removeGenericTypeItem', function () {
			var currentListItemParentId = 1,
				currentItemK2Id = 2,
				currentItemNestedElementId = 3,
				currentItemNestedListId = 4;

			beforeEach( function () {
				context = $.extend( context, {
					getters: {
						getZObjectById: jest.fn().mockReturnValue( {
							id: currentListItemParentId
						} ),
						getNestedZObjectById: jest.fn()
							.mockReturnValueOnce( {
								id: currentItemK2Id
							} )
							.mockReturnValueOnce( {
								id: currentItemNestedElementId
							} )
							.mockReturnValueOnce( {
								id: currentItemNestedListId
							} )
					}
				} );
			} );

			it( 'does not call setZObjectParent if nested item is not available', function () {
				var item = {
					id: 0,
					parent: 1
				};

				context = $.extend( context, {
					getters: {
						getZObjectById: jest.fn().mockReturnValue( {
							id: currentListItemParentId
						} ),
						getNestedZObjectById: jest.fn()
							.mockReturnValueOnce( {
								id: currentItemK2Id
							} )
							.mockReturnValue( false )

					}
				} );

				zGenericTypeModule.actions.removeGenericTypeItem( context, item );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 0 ][ 0 ] ).not.toBe( 'setZObjectParent' );
			} );

			it( 'calls setZObjectParent when nested item is available', function () {
				var item = {
					id: 0,
					parent: 1
				};
				zGenericTypeModule.actions.removeGenericTypeItem( context, item );

				expect( context.dispatch ).toHaveBeenCalled();
			} );

			it( 'change current item nested Element parent to current list parent', function () {
				var item = {
					id: 0,
					parent: 1
				};
				zGenericTypeModule.actions.removeGenericTypeItem( context, item );

				expect( context.dispatch.mock.calls[ 0 ][ 1 ].id ).toBe( currentItemNestedElementId );
				expect( context.dispatch.mock.calls[ 0 ][ 1 ].parent ).toBe( currentListItemParentId );
			} );

			it( 'change current item nested list parent to current list parent', function () {
				var item = {
					id: 0,
					parent: 1
				};
				zGenericTypeModule.actions.removeGenericTypeItem( context, item );

				expect( context.dispatch.mock.calls[ 1 ][ 1 ].id ).toBe( currentItemNestedListId );
				expect( context.dispatch.mock.calls[ 1 ][ 1 ].parent ).toBe( currentListItemParentId );
			} );

			it( 'removes current item and children', function () {
				var item = {
					id: 0,
					parent: 1
				};
				zGenericTypeModule.actions.removeGenericTypeItem( context, item );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObjectChildren', item.id );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObject', item.id );
			} );

			it( 'removes current K2 value and children', function () {
				var item = {
					id: 0,
					parent: 1
				};
				zGenericTypeModule.actions.removeGenericTypeItem( context, item );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObjectChildren', currentItemK2Id );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObject', currentItemK2Id );
			} );
		} );
	} );
} );
