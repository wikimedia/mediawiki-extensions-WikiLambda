/*!
 * WikiLambda unit test suite for the FunctionAbout component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
var shallowMount = require( '@vue/test-utils' ).shallowMount,
	FunctionAbout = require( '../../../../resources/ext.wikilambda.edit/views/function/FunctionAbout.vue' );
describe( 'FunctionAbout', function () {
	it( 'renders without errors', function () {
		var wrapper = shallowMount( FunctionAbout );
		expect( wrapper.find( '.ext-wikilambda-function-details' ) ).toBeTruthy();
	} );
} );
