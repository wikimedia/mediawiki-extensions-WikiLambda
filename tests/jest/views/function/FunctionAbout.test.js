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
	var $i18n;
	beforeEach( function () {
		$i18n = jest.fn();
	} );
	it( 'renders without errors', function () {
		var wrapper = shallowMount( FunctionAbout, {
			global: {
				mocks: {
					$i18n: $i18n
				}
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-details' ) ).toBeTruthy();
	} );
} );
