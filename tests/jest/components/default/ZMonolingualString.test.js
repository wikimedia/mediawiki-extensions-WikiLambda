/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	mount = require( '@vue/test-utils' ).mount,
	createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZMonolingualString = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZMonolingualString.vue' ),
	CdxTextInput = require( '@wikimedia/codex' ).CdxTextInput,
	Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'ZMonolingualString', () => {
	let store;
	beforeEach( () => {
		store = useMainStore();
		store.getLabelData = createLabelDataMock();
		store.getLanguageIsoCodeOfZLang = createGettersWithFunctionsMock( 'EN' );
		store.getZMonolingualTextValue = createGettersWithFunctionsMock( 'my label' );
		store.getZMonolingualLangValue = createGettersWithFunctionsMock( 'Z10002' );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZMonolingualString, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays a language chip', () => {
			const wrapper = mount( ZMonolingualString, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-monolingual-string__chip' ).exists() ).toBeTruthy();

			expect( wrapper.find( '.ext-wikilambda-app-monolingual-string__chip' ).text() ).toBe( 'EN' );
		} );

		it( 'displays the label value for the language', () => {
			const wrapper = shallowMount( ZMonolingualString, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-monolingual-string__view-mode' ).text() ).toContain( 'my label' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZMonolingualString, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
			expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-edit-monolingual-text-placeholder' );
		} );

		it( 'displays a language chip', () => {
			const wrapper = mount( ZMonolingualString, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-monolingual-string__chip' ).exists() ).toBeTruthy();

			expect( wrapper.find( '.ext-wikilambda-app-monolingual-string__chip' ).text() ).toBe( 'EN' );
		} );

		it( 'its label value can be edited and the value emitted', async () => {
			const wrapper = shallowMount( ZMonolingualString, {
				props: {
					edit: true
				}
			} );

			await wrapper.getComponent( CdxTextInput ).vm.$emit( 'update:modelValue', 'my new label' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [ Constants.Z_MONOLINGUALSTRING_VALUE,
				Constants.Z_STRING_VALUE ], value: 'my new label' } ] ] );
		} );
	} );
} );
