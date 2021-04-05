/*!
 * WikiLambda unit test suite for the ZString component and related files.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var mount = require( '@vue/test-utils' ).mount,
	ZString = require( '../../../../resources/ext.wikilambda.edit/components/types/ZString.vue' );

describe( 'ZString', function () {
	it( 'renders without errors', function () {
		var wrapper = mount( ZString, {
			propsData: {
				viewmode: false
			}
		} );

		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );

	it( 'emits input from an input element', function () {
		var wrapper = mount( ZString, {
			propsData: {
				viewmode: false
			}
		} );

		wrapper.find( 'input' ).setValue( 'A new string' );
		wrapper.find( 'input' ).trigger( 'change' );
		expect( wrapper.emitted().input ).toBeTruthy();
		expect( wrapper.emitted().input[ 1 ][ 0 ] ).toEqual( 'A new string' );
	} );

	it( 'accepts an object as zobject', function () {
		var wrapper = mount( ZString, {
			propsData: {
				viewmode: false,
				zobject: {
					Z1K1: 'Z6',
					Z6K1: 'ZObject format'
				}
			}
		} );

		expect( wrapper.find( 'input' ).element.value ).toEqual( 'ZObject format' );
	} );

	it( 'accepts a string as zobject', function () {
		var wrapper = mount( ZString, {
			propsData: {
				viewmode: false,
				zobject: 'String format'
			}
		} );

		expect( wrapper.find( 'input' ).element.value ).toEqual( 'String format' );
	} );

	it( 'displays the text when in viewmode', function () {
		var wrapper = mount( ZString, {
			propsData: {
				viewmode: true,
				zobject: 'ZString in viewmode'
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-zstring > span > span' ).text() ).toEqual( 'ZString in viewmode' );
	} );
} );
