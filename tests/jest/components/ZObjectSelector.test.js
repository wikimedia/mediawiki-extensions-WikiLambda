/*!
 * WikiLambda unit test suite for the ZObjectSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
var mount = require( '@vue/test-utils' ).mount,
	ZObjectSelector = require( '../../../resources/ext.wikilambda.edit/components/ZObjectSelector.vue' );
describe( 'ZObjectSelector', function () {
	var state,
		getters,
		actions,
		mutations;
	beforeEach( function () {
		state = {
			zKeys: {},
			zKeyLabels: {},
			fetchingZKeys: []
		};
		getters = {
			getZkeyLabels: jest.fn( function ( s ) {
				return s.zKeyLabels;
			} ),
			getZkeys: jest.fn( function ( s ) {
				return s.zKeys;
			} ),
			getZLang: jest.fn( function () {
				return 'en';
			} ),
			getViewMode: jest.fn( function () {
				return false;
			} )
		};
		actions = {
			// eslint-disable-next-line no-unused-vars
			fetchZKeyWithDebounce: jest.fn( function ( context, payload ) {
				return true;
			} )
		};
		mutations = {
			addZKeyLabel: jest.fn( function ( s, payload ) {
				s.zKeyLabels[ payload.key ] = payload.label;
			} )
		};

		global.store.hotUpdate( {
			state: state,
			getters: getters,
			actions: actions,
			mutations: mutations
		} );
	} );
	it( 'renders without errors', function () {
		var wrapper = mount( ZObjectSelector );
		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );
} );
