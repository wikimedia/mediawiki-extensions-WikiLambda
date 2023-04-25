/*!
 * WikiLambda unit test suite for the default ZTester component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZTester = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZTester.vue' );

describe( 'ZTester', () => {
	var getters;
	beforeEach( () => {
		getters = {
			getRowByKeyPath: createGettersWithFunctionsMock( 1 )
		};
		global.store.hotUpdate( { getters: getters } );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZTester, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-tester' ).exists() ).toBe( true );
		} );

		it( 'renders function block', () => {
			var wrapper = shallowMount( ZTester, {
				props: {
					edit: false
				}
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-tester-function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester call block', () => {
			var wrapper = shallowMount( ZTester, {
				props: {
					edit: false
				}
			} );
			const callBlock = wrapper.find( 'div[role=ext-wikilambda-tester-call]' );
			expect( callBlock.exists() ).toBe( true );
			expect( callBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester validation block', () => {
			var wrapper = shallowMount( ZTester, {
				props: {
					edit: false
				}
			} );
			const callBlock = wrapper.find( 'div[role=ext-wikilambda-tester-validation]' );
			expect( callBlock.exists() ).toBe( true );
			expect( callBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-tester' ).exists() ).toBe( true );
		} );

		it( 'renders function block', () => {
			var wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				}
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-tester-function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester call block', () => {
			var wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				}
			} );
			const callBlock = wrapper.find( 'div[role=ext-wikilambda-tester-call]' );
			expect( callBlock.exists() ).toBe( true );
			expect( callBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester validation block', () => {
			var wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				}
			} );
			const callBlock = wrapper.find( 'div[role=ext-wikilambda-tester-validation]' );
			expect( callBlock.exists() ).toBe( true );
			expect( callBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );
	} );
} );
