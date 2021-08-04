/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createLocalVue = require( '@vue/test-utils' ).createLocalVue,
	Vuex = require( 'vuex' ),
	ZObjectViewer = require( '../../../resources/ext.wikilambda.edit/components/ZObjectViewer.vue' ),
	localVue;

localVue = createLocalVue();
localVue.use( Vuex );

describe( 'ZObjectViewer', function () {
	var actions,
		store;

	beforeEach( function () {
		actions = {
			initialize: jest.fn()
		};

		store = new Vuex.Store( {
			actions: actions
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZObjectViewer, {
			store: store,
			localVue: localVue,
			mocks: {
				$i18n: jest.fn()
			}
		} );

		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );
} );
