/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	ZObjectViewer = require( '../../../resources/ext.wikilambda.edit/views/ZObjectViewer.vue' );

describe( 'ZObjectViewer', function () {
	var actions;

	beforeEach( function () {
		actions = {
			initialize: jest.fn()
		};

		global.store.hotUpdate( {
			actions: actions
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZObjectViewer );

		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );
} );
