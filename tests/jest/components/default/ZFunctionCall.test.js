/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZFunctionCall = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZFunctionCall.vue' ),
	useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'ZFunctionCall', () => {
	describe( 'in view and edit mode', () => {
		let store;

		beforeEach( () => {
			store = useMainStore();
			store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z801' );
		} );

		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZFunctionCall );
			expect( wrapper.find( '.ext-wikilambda-app-function-call' ).exists() ).toBe( true );
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
