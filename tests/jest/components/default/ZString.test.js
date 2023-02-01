/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	TextInput = require( '../../../../resources/ext.wikilambda.edit/components/base/TextInput.vue' ),
	ZString = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZString.vue' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'ZString', () => {
	var getters;
	beforeEach( () => {
		getters = {
			getZObjectKeyByRowId: createGettersWithFunctionsMock( Constants.Z_ARGUMENT_KEY ),
			getZStringTerminalValue: createGettersWithFunctionsMock( 'my terminating string' )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZString, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays the terminating string value', async () => {
			var wrapper = shallowMount( ZString, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( 'p' ).text() ).toBe( 'my terminating string' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'takes an input and emits the value with a Z_STRING_VALUE (Z6K1) keyPath if its key is not a Z_STRING_VALUE',
			async () => {
				var wrapper = shallowMount( ZString, {
					props: {
						edit: true
					}
				} );

				await wrapper.getComponent( TextInput ).vm.$emit( 'input', 'my string value' );

				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [ 'Z6K1' ], value: 'my string value' } ] ] );
			} );

		it( 'takes an input and emits the value with an empty keyPath if its key is a Z_STRING_VALUE (Z6K1)', async () => {
			getters = {
				getZObjectKeyByRowId: createGettersWithFunctionsMock( Constants.Z_STRING_VALUE ),
				getZStringTerminalValue: createGettersWithFunctionsMock( {} )
			};

			await global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = shallowMount( ZString, {
				props: {
					edit: true
				}
			} );

			await wrapper.getComponent( TextInput ).vm.$emit( 'input', 'my string value' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [], value: 'my string value' } ] ] );
		} );
	} );
} );
