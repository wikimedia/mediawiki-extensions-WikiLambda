/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZMonolingualString = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZMonolingualString.vue' ),
	TextInput = require( '../../../../resources/ext.wikilambda.edit/components/base/TextInput.vue' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'ZMonolingualString', () => {
	var getters;
	beforeEach( () => {
		getters = {
			getLabel: createGettersWithFunctionsMock( { label: 'English', lang: 'Z1002', zid: 'Z1002' } ),
			getLanguageIsoCodeOfZLang: createGettersWithFunctionsMock( 'EN' ),
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
			var wrapper = mount( ZMonolingualString, {
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
			var wrapper = mount( ZMonolingualString, {
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

			await wrapper.getComponent( TextInput ).vm.$emit( 'input', 'my new label' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [ Constants.Z_MONOLINGUALSTRING_VALUE,
				Constants.Z_STRING_VALUE ], value: 'my new label' } ] ] );
		} );
	} );
} );
