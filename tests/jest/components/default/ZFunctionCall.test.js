/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZFunctionCall = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZFunctionCall.vue' );

describe( 'ZFunctionCall', () => {
	describe( 'in view and edit mode', () => {
		var getters;

		beforeEach( () => {
			getters = {
				getZFunctionCallFunctionId: createGettersWithFunctionsMock( 'Z801' )
			};
			global.store.hotUpdate( {
				getters: getters
			} );
		} );

		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZFunctionCall );
			expect( wrapper.find( '.ext-wikilambda-function-call' ).exists() ).toBe( true );
		} );

		it( 'displays a function call icon', () => {
			const wrapper = shallowMount( ZFunctionCall );
			expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
		} );

		it( 'renders the ZObjectToString component', () => {
			const wrapper = shallowMount( ZFunctionCall );
			expect( wrapper.findComponent( { name: 'wl-z-object-to-string' } ).exists() ).toBe( true );
		} );
	} );
} );
