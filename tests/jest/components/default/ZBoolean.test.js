/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const ZBoolean = require( '../../../../resources/ext.wikilambda.app/components/types/ZBoolean.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { createLabelDataMock } = require( '../../helpers/getterHelpers.js' );

// General use
const keyPath = 'main.Z2K2';
const objectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z40' },
	Z40K1: { Z1K1: 'Z9', Z9K1: 'Z42' }
};

describe( 'ZBoolean', () => {
	let store;

	/**
	 * Helper function to render ZBoolean component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderZBoolean( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false
		};
		return shallowMount( ZBoolean, { props: { ...defaultProps, ...props }, ...options } );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangCode = 'en';
		store.getLabelData = createLabelDataMock( {
			Z41: 'true',
			Z42: 'false'
		} );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderZBoolean();

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'does not load the radio codex component', () => {
			const wrapper = renderZBoolean();

			expect( wrapper.findComponent( { name: 'cdx-radio' } ).exists() ).toBe( false );
		} );

		it( 'displays the boolean value label', () => {
			const wrapper = renderZBoolean();

			expect( wrapper.find( '.ext-wikilambda-app-link' ).exists() ).toBe( true );
			expect( wrapper.get( '.ext-wikilambda-app-link' ).text() ).toBe( 'false' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'loads the radio codex component', () => {
			const wrapper = renderZBoolean( { edit: true } );

			expect( wrapper.findComponent( { name: 'cdx-radio' } ).exists() ).toBe( true );
		} );

		it( 'changes the boolean value when selected', async () => {
			const wrapper = renderZBoolean( { edit: true } );

			expect( wrapper.getComponent( { name: 'cdx-radio' } ).exists() ).toBe( true );
			await wrapper.getComponent( { name: 'cdx-radio' } ).vm.$emit( 'update:modelValue', 'Z41' );
			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [ Constants.Z_BOOLEAN_IDENTITY, Constants.Z_REFERENCE_ID ], value: 'Z41' } ] ] );

		} );
	} );
} );
