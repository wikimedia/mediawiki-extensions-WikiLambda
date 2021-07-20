/*!
 * WikiLambda unit test suite for the ZObject component and related files.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var mount = require( '@vue/test-utils' ).mount,
	createLocalVue = require( '@vue/test-utils' ).createLocalVue,
	Vuex = require( 'vuex' ),
	ZList = require( '../../../../resources/ext.wikilambda.edit/components/types/ZList.vue' ),
	ZListItem = require( '../../../../resources/ext.wikilambda.edit/components/types/ZListItem.vue' ),
	zobjectModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zobject.js' ),
	localVue,
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
		{ key: 'Z1K1', value: 'Z11', parent: 9, id: 10 },
		{ key: 'Z11K1', value: 'object', parent: 9, id: 11 },
		{ key: 'Z1K1', value: 'Z9', parent: 11, id: 12 },
		{ key: 'Z9K1', value: 'Z1002', parent: 11, id: 13 },
		{ key: 'Z11K2', value: 'object', parent: 9, id: 14 },
		{ key: 'Z1K1', value: 'Z6', parent: 14, id: 15 },
		{ key: 'Z6K1', value: '', parent: 14, id: 16 },
		{ key: 0, value: 'object', parent: 3, id: 17 },
		{ key: 'Z1K1', value: 'Z6', parent: 17, id: 18 },
		{ key: 'Z6K1', value: 'first', parent: 17, id: 19 },
		{ key: 1, value: 'object', parent: 3, id: 20 },
		{ key: 'Z1K1', value: 'Z6', parent: 20, id: 21 },
		{ key: 'Z6K1', value: 'second', parent: 20, id: 22 }
	];

localVue = createLocalVue();
localVue.use( Vuex );

describe( 'ZList', function () {
	var state,
		getters,
		mutations,
		actions,
		store,
		isViewMode = false;

	beforeAll( function () {
		getters = $.extend( zobjectModule.getters, {
			getViewMode: function () {
				return isViewMode;
			}
		} );
		mutations = zobjectModule.mutations;
		actions = $.extend( zobjectModule.actions, {
			fetchZKeys: jest.fn()
		} );
	} );

	beforeEach( function () {
		state = {
			zobject: JSON.parse( JSON.stringify( zobjectTree ) )
		};

		store = new Vuex.Store( {
			state: state,
			getters: getters,
			mutations: mutations,
			actions: actions
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = mount( ZList, {
			localVue: localVue,
			store: store,
			propsData: {
				zobjectId: 3
			},
			mocks: {
				$i18n: jest.fn()
			}
		} );

		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );

	it( 'renders a tree of ZList items', function () {
		var wrapper = mount( ZList, {
			localVue: localVue,
			store: store,
			propsData: {
				zobjectId: 3
			},
			mocks: {
				$i18n: jest.fn()
			}
		} );

		expect( wrapper.findAllComponents( ZListItem ).length ).toBe( 2 );
	} );

	it( 'adds an item to the list when the add button is clicked', function () {
		var wrapper = mount( ZList, {
				localVue: localVue,
				store: store,
				propsData: {
					zobjectId: 3
				},
				mocks: {
					$i18n: jest.fn()
				}
			} ),
			expectedZObject = JSON.parse( JSON.stringify( zobjectTree ) );
		expectedZObject.push( { id: 23, key: 2, parent: 3, value: 'object' } );

		wrapper.find( '.z-list-add' ).trigger( 'click' );

		expect( store.state.zobject ).toEqual( expectedZObject );
		expect( store.state.zobject.length ).toBe( 24 );
	} );

	it( 'removes an item from the list when the remove button is clicked', function () {
		var wrapper = mount( ZList, {
				localVue: localVue,
				store: store,
				propsData: {
					zobjectId: 3
				},
				mocks: {
					$i18n: jest.fn()
				}
			} ),
			expectedZObject = zobjectTree.filter( function ( zobject ) {
				return [ 17, 18, 19 ].indexOf( zobject.id ) === -1;
			} ),
			expectedFirstItem = { id: 20, key: 0, parent: 3, value: 'object' };
		wrapper.find( '.z-list-item-remove' ).trigger( 'click' );

		expect( store.state.zobject ).toEqual( expectedZObject );
		expect( store.state.zobject.length ).toBe( 20 );

		// Ensure that the index of the remaining item was updated from 1 to 0
		localVue.nextTick().then( function () {
			expect( store.getters.getZObjectById( 20 ) ).toEqual( expectedFirstItem );
		} );
	} );
} );
