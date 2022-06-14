/*!
 * WikiLambda unit test suite for the ZObject component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	Vue = require( 'vue' ),
	ZList = require( '../../../../resources/ext.wikilambda.edit/components/types/ZList.vue' ),
	ZListItem = require( '../../../../resources/ext.wikilambda.edit/components/types/ZListItem.vue' ),
	zobjectModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zobject.js' ),
	zobjectTree = [
		{ id: 0, value: 'object' },
		{ key: 'Z1K1', value: 'Z2', parent: 0, id: 1 },
		{ key: 'Z2K1', value: 'object', parent: 0, id: 2 },
		{ key: 'Z2K2', value: 'array', parent: 0, id: 3 },
		{ key: 'Z1K1', value: 'Z9', parent: 2, id: 4 },
		{ key: 'Z9K1', value: 'Z0', parent: 2, id: 5 },
		{ key: 'Z2K3', value: 'object', parent: 0, id: 6 },
		{ key: 'Z1K1', value: 'Z12', parent: 6, id: 7 },
		{ key: 'Z12K1', value: 'array', parent: 6, id: 8 },
		{ key: 0, value: 'object', parent: 8, id: 9 },
		{ key: 'Z1K1', value: 'Z9', parent: 9, id: 10 },
		{ key: 'Z9K1', value: 'Z11', parent: 9, id: 11 },
		{ key: 1, value: 'object', parent: 8, id: 12 },
		{ key: 'Z1K1', value: 'Z11', parent: 12, id: 13 },
		{ key: 'Z11K1', value: 'object', parent: 12, id: 14 },
		{ key: 'Z1K1', value: 'Z9', parent: 14, id: 15 },
		{ key: 'Z9K1', value: 'Z1002', parent: 14, id: 16 },
		{ key: 'Z11K2', value: 'object', parent: 9, id: 17 },
		{ key: 'Z1K1', value: 'Z6', parent: 17, id: 18 },
		{ key: 'Z6K1', value: '', parent: 17, id: 19 },
		{ key: 0, value: 'object', parent: 3, id: 20 },
		{ key: 'Z1K1', value: 'Z9', parent: 20, id: 21 },
		{ key: 'Z9K1', value: 'Z6', parent: 20, id: 22 },
		{ key: 1, value: 'object', parent: 3, id: 23 },
		{ key: 'Z1K1', value: 'Z6', parent: 23, id: 24 },
		{ key: 'Z6K1', value: 'first', parent: 23, id: 25 },
		{ key: 2, value: 'object', parent: 3, id: 26 },
		{ key: 'Z1K1', value: 'Z6', parent: 26, id: 27 },
		{ key: 'Z6K1', value: 'second', parent: 26, id: 28 }
	];

describe( 'ZList', function () {
	var getters,
		mutations,
		actions,
		isViewMode = false;

	getters = $.extend( zobjectModule.getters, {
		getViewMode: function () {
			return isViewMode;
		}
	} );

	mutations = zobjectModule.mutations;

	actions = $.extend( zobjectModule.actions, {
		fetchZKeys: jest.fn()
	} );

	global.store.hotUpdate( {
		getters: getters,
		mutations: mutations,
		actions: actions
	} );

	beforeEach( function () {
		global.store.replaceState( {
			zobject: JSON.parse( JSON.stringify( zobjectTree ) )
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.mount( ZList, {
			props: {
				zobjectId: 3
			}
		} );

		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );

	it( 'renders a tree of ZList items', function () {
		var wrapper = VueTestUtils.mount( ZList, {
			props: {
				zobjectId: 3
			}
		} );

		expect( wrapper.findAllComponents( ZListItem ).length ).toBe( 2 );
	} );

	it( 'adds an item to the list when the add button is clicked', function () {
		var wrapper = VueTestUtils.mount( ZList, {
				props: {
					zobjectId: 3
				}
			} ),
			expectedZObject = JSON.parse( JSON.stringify( zobjectTree ) );
		expectedZObject.push( { id: 29, key: 3, parent: 3, value: 'object' } );

		wrapper.find( '.z-list-add' ).trigger( 'click' );

		expect( global.store.state.zobject ).toEqual( expectedZObject );
		expect( global.store.state.zobject.length ).toBe( 30 );
	} );

	it( 'removes an item from the list when the remove button is clicked', function () {
		var wrapper = VueTestUtils.mount( ZList, {
				props: {
					zobjectId: 3
				}
			} ),
			expectedZObject = zobjectTree.filter( function ( zobject ) {
				return [ 23, 24, 25 ].indexOf( zobject.id ) === -1;
			} ),
			expectedFirstItem = { id: 20, key: 0, parent: 3, value: 'object' };
		wrapper.find( '.z-list-item-remove' ).trigger( 'click' );

		expect( global.store.state.zobject ).toEqual( expectedZObject );
		expect( global.store.state.zobject.length ).toBe( 26 );

		// Ensure that the index of the remaining item was updated from 1 to 0
		Vue.nextTick().then( function () {
			expect( global.store.getters.getZObjectById( 20 ) ).toEqual( expectedFirstItem );
		} );
	} );
} );
