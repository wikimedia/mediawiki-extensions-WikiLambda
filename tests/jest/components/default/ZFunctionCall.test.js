/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { CdxIcon } = require( '@wikimedia/codex' );
var shallowMount = require( '@vue/test-utils' ).shallowMount,
	ZFunctionCall = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZFunctionCall.vue' ),
	ZObjectToString = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZObjectToString.vue' );

describe( 'ZFunctionCall', () => {
	describe( 'in view and edit mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZFunctionCall );
			expect( wrapper.find( '.ext-wikilambda-function-call' ).exists() ).toBe( true );
		} );

		it( 'displays a function call icon', () => {
			var wrapper = shallowMount( ZFunctionCall );
			expect( wrapper.findComponent( CdxIcon ).exists() ).toBe( true );
		} );

		it( 'renders the ZObjectToString component', () => {
			var wrapper = shallowMount( ZFunctionCall );
			expect( wrapper.findComponent( ZObjectToString ).exists() ).toBe( true );
		} );
	} );
} );
