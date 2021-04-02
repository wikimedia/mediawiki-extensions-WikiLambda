/*!
 * WikiLambda unit test suite for the ZObject component and related files.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	ZObject = require( '../../../resources/ext.wikilambda.edit/components/ZObject.vue' );

describe( 'ZObject', function () {
	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZObject, {
			propsData: {
				zobject: '',
				persistent: false,
				viewmode: false
			}
		} );

		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );
} );
