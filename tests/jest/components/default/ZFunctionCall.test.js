/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const ZFunctionCall = require( '../../../../resources/ext.wikilambda.app/components/types/ZFunctionCall.vue' );

// General use
const keyPath = 'main.Z2K2';
const objectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z801' },
	Z801K1: { Z1K1: 'Z6', Z6K1: 'hello world' }
};

describe( 'ZFunctionCall', () => {
	describe( 'in view and edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZFunctionCall, {
				props: {
					keyPath,
					objectValue,
					edit: true
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-app-function-call' ).exists() ).toBe( true );
		} );

		it( 'displays a function call icon', () => {
			const wrapper = shallowMount( ZFunctionCall, {
				props: {
					keyPath,
					objectValue,
					edit: true
				}
			} );
			expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
		} );

		it( 'renders the ZObjectToString component', () => {
			const wrapper = shallowMount( ZFunctionCall, {
				props: {
					keyPath,
					objectValue,
					edit: true
				}
			} );
			expect( wrapper.findComponent( { name: 'wl-z-object-to-string' } ).exists() ).toBe( true );
		} );
	} );
} );
