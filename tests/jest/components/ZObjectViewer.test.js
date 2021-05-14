/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	ZObjectViewer = require( '../../../resources/ext.wikilambda.edit/components/ZObjectViewer.vue' );

describe( 'ZObjectViewer', function () {

	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZObjectViewer );

		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );
} );
