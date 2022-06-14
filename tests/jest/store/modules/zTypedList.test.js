/*!
 * WikiLambda unit test suite for the zTypedList Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var zTypedListModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zTypedList.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	context;

describe( 'zTypedList Vuex module', function () {
	beforeEach( function () {
		context = $.extend( {}, {
			commit: jest.fn(),
			getters: {
				getNestedZObjectById: jest.fn().mockReturnValue( {
					value: 'dummy'
				} ),
				getZObjectChildrenByIdRecursively: jest.fn().mockReturnValue( [] )
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
		// TODO(T298133): Rewrite test for addTypedListItem method
		describe.skip( 'addTypedListItem', function () {

			it( 'set new item parent id equal to root if list has no items', function () {
				var payload = {
					id: 1,
					zObjectChildren: []
				};

				zTypedListModule.actions.addTypedListItem( context, payload );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 0 ][ 0 ] ).toBe( 'addZObject' );
				expect( context.dispatch.mock.calls[ 0 ][ 1 ].parent ).toBe( payload.id );
			} );

			it( 'set new item parent id equal to last k2 parent entry', function () {
				var expectedParent = 15,
					payload = {
						id: 1
					};
				context.getters.getZObjectChildrenByIdRecursively.mockReturnValueOnce( [
					{ key: 'K2', id: 5 },
					{ key: 'dummy', id: 10 },
					{ key: 'K2', id: expectedParent }
				] );
				zTypedListModule.actions.addTypedListItem( context, payload );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 0 ][ 0 ] ).toBe( 'addZObject' );
				expect( context.dispatch.mock.calls[ 0 ][ 1 ].parent ).toBe( expectedParent );
			} );

			it( 'add a Z_TYPED_OBJECT_ELEMENT_1', function () {
				var payload = {
					id: 1
				};
				zTypedListModule.actions.addTypedListItem( context, payload );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 0 ][ 0 ] ).toBe( 'addZObject' );
				expect( context.dispatch.mock.calls[ 0 ][ 1 ].key ).toBe( Constants.Z_TYPED_OBJECT_ELEMENT_1 );
			} );

			it( 'set type of Z_TYPED_OBJECT_ELEMENT_1 to current list type', function () {
				var payload = {
					id: 1,
					value: 'dummyType'
				};
				zTypedListModule.actions.addTypedListItem( context, payload );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 1 ][ 0 ] ).toBe( 'changeType' );
				expect( context.dispatch.mock.calls[ 1 ][ 1 ].type ).toBe( payload.value );
			} );

			it( 'add a Z_TYPED_OBJECT_ELEMENT_2', function () {
				var payload = {
					id: 1,
					value: 'dummyType'
				};
				zTypedListModule.actions.addTypedListItem( context, payload );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 2 ][ 0 ] ).toBe( 'addZObject' );
				expect( context.dispatch.mock.calls[ 2 ][ 1 ].key ).toBe( Constants.Z_TYPED_OBJECT_ELEMENT_2 );
			} );

			it( 'call zListGeneric with the current list type', function () {
				var payload = {
					id: 1,
					value: 'dummyType'
				};
				zTypedListModule.actions.addTypedListItem( context, payload );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 3 ][ 0 ] ).toBe( 'addZTypedList' );
				expect( context.dispatch.mock.calls[ 3 ][ 1 ].value ).toBe( payload.value );
			} );
		} );

		describe( 'setTypeOfTypedList', function () {
			it( 'update current list generic type', function () {
				var payload = {
					type: 'testValue'
				};

				zTypedListModule.actions.setTypeOfTypedList( context, payload );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 0 ][ 0 ] ).toBe( 'setZObjectValue' );
				expect( context.dispatch.mock.calls[ 0 ][ 1 ].value ).toBe( payload.type );
			} );
		} );

		describe( 'removeTypedListItem', function () {
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

				zTypedListModule.actions.removeTypedListItem( context, item );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch.mock.calls[ 0 ][ 0 ] ).not.toBe( 'setZObjectParent' );
			} );

			it( 'calls setZObjectParent when nested item is available', function () {
				var item = {
					id: 0,
					parent: 1
				};
				zTypedListModule.actions.removeTypedListItem( context, item );

				expect( context.dispatch ).toHaveBeenCalled();
			} );

			it( 'change current item nested Element parent to current list parent', function () {
				var item = {
					id: 0,
					parent: 1
				};
				zTypedListModule.actions.removeTypedListItem( context, item );

				expect( context.dispatch.mock.calls[ 0 ][ 1 ].id ).toBe( currentItemNestedElementId );
				expect( context.dispatch.mock.calls[ 0 ][ 1 ].parent ).toBe( currentListItemParentId );
			} );

			it( 'change current item nested list parent to current list parent', function () {
				var item = {
					id: 0,
					parent: 1
				};
				zTypedListModule.actions.removeTypedListItem( context, item );

				expect( context.dispatch.mock.calls[ 1 ][ 1 ].id ).toBe( currentItemNestedListId );
				expect( context.dispatch.mock.calls[ 1 ][ 1 ].parent ).toBe( currentListItemParentId );
			} );

			it( 'removes current item and children', function () {
				var item = {
					id: 0,
					parent: 1
				};
				zTypedListModule.actions.removeTypedListItem( context, item );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObjectChildren', item.id );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObject', item.id );
			} );

			it( 'removes current K2 value and children', function () {
				var item = {
					id: 0,
					parent: 1
				};
				zTypedListModule.actions.removeTypedListItem( context, item );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObjectChildren', currentItemK2Id );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObject', currentItemK2Id );
			} );
		} );
	} );
} );
