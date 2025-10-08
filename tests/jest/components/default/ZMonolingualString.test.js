/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount, shallowMount } = require( '@vue/test-utils' );

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const ZMonolingualString = require( '../../../../resources/ext.wikilambda.app/components/types/ZMonolingualString.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { createGettersWithFunctionsMock } = require( '../../helpers/getterHelpers.js' );

// General use
const keyPath = 'main.Z2K2';
const objectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
	Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
	Z11K2: { Z1K1: 'Z6', Z6K1: 'my label' }
};

describe( 'ZMonolingualString', () => {
	let store;

	/**
	 * Helper function to render ZMonolingualString component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderZMonolingualString( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false
		};
		return shallowMount( ZMonolingualString, { props: { ...defaultProps, ...props }, ...options } );
	}

	/**
	 * Helper function to fully render ZMonolingualString component (not shallow)
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderZMonolingualStringFull( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false
		};
		return mount( ZMonolingualString, { props: { ...defaultProps, ...props }, ...options } );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getLanguageIsoCodeOfZLang = createGettersWithFunctionsMock( 'EN' );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderZMonolingualString();
			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays a language chip', () => {
			const wrapper = renderZMonolingualStringFull();

			expect( wrapper.find( '.ext-wikilambda-app-monolingual-string__chip' ).exists() ).toBe( true );

			expect( wrapper.get( '.ext-wikilambda-app-monolingual-string__chip' ).text() ).toBe( 'EN' );
		} );

		it( 'displays the label value for the language', () => {
			const wrapper = renderZMonolingualString();

			expect( wrapper.get( '.ext-wikilambda-app-monolingual-string__view-mode' ).text() ).toContain( 'my label' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderZMonolingualString( { edit: true } );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
			expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-edit-monolingual-text-placeholder' );
		} );

		it( 'displays a language chip', () => {
			const wrapper = renderZMonolingualStringFull();

			expect( wrapper.find( '.ext-wikilambda-app-monolingual-string__chip' ).exists() ).toBe( true );

			expect( wrapper.get( '.ext-wikilambda-app-monolingual-string__chip' ).text() ).toBe( 'EN' );
		} );

		it( 'its label value can be edited and the value emitted', async () => {
			const wrapper = renderZMonolingualString( { edit: true } );

			await wrapper.getComponent( { name: 'cdx-text-input' } ).vm.$emit( 'update:modelValue', 'my new label' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [ Constants.Z_MONOLINGUALSTRING_VALUE,
				Constants.Z_STRING_VALUE ], value: 'my new label' } ] ] );
		} );
	} );
} );
