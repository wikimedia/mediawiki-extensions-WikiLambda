/*!
 * WikiLambda unit test suite for the zTypedList Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var zTypedListModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zTypedList.js' ),
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
