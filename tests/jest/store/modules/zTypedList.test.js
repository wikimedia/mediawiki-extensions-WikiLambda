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
	} );
} );
