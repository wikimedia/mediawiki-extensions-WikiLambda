/*!
 * WikiLambda unit test suite for the FunctionDetails component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
var shallowMount = require( '@vue/test-utils' ).shallowMount,
	FunctionDetails = require( '../../../../resources/ext.wikilambda.edit/views/function/FunctionDetails.vue' );
describe( 'FunctionDetails', function () {
	var $i18n;
	beforeEach( function () {
		$i18n = jest.fn();
	} );
	it( 'renders without errors', function () {
		var wrapper = shallowMount( FunctionDetails, {
			global: {
				mocks: {
					$i18n: $i18n
				}
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-details' ) ).toBeTruthy();
	} );
} );
