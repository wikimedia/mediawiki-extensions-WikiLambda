/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZMonolingualString = require( '../../../../resources/ext.wikilambda.edit/components/default/ZMonolingualString.vue' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'ZMonolingualString', () => {
	var getters;
	beforeEach( () => {
		getters = {
			getLabel: createGettersWithFunctionsMock( { label: 'EN', lang: 'Z1002', zid: 'Z10002' } ),
			getZMonolingualTextValue: createGettersWithFunctionsMock( 'my label' ),
			getZMonolingualLangValue: createGettersWithFunctionsMock( 'Z10002' )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZMonolingualString, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays a language chip', () => {
			var wrapper = shallowMount( ZMonolingualString, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-lang-chip' ).exists() ).toBeTruthy();

			expect( wrapper.find( '.ext-wikilambda-lang-chip' ).text() ).toBe( 'EN' );
		} );

		it( 'displays the label value for the language', () => {
			var wrapper = shallowMount( ZMonolingualString, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( 'p' ).text() ).toContain( 'my label' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZMonolingualString, {
				props: {
					edit: true
				}
			} );
			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays a language chip', () => {
			var wrapper = shallowMount( ZMonolingualString, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-lang-chip' ).exists() ).toBeTruthy();

			expect( wrapper.find( '.ext-wikilambda-lang-chip' ).text() ).toBe( 'EN' );
		} );

		it( 'its label value can be edited and the value emitted', async () => {
			var wrapper = shallowMount( ZMonolingualString, {
				props: {
					edit: true
				}
			} );

			const input = wrapper.find( 'input' );
			expect( input.element.value ).toBe( 'my label' );

			await input.setValue( 'my new label' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [ Constants.Z_MONOLINGUALSTRING_VALUE,
				Constants.Z_STRING_VALUE ], value: 'my new label' } ] ] );
		} );
	} );
} );