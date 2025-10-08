/*!
 * WikiLambda unit test suite for the default LocalizedLabel component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { createGettersWithFunctionsMock } = require( '../../helpers/getterHelpers.js' );
const LabelData = require( '../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const LocalizedLabel = require( '../../../../resources/ext.wikilambda.app/components/base/LocalizedLabel.vue' );

describe( 'LocalizedLabel', () => {
	let store;

	/**
	 * Helper function to render LocalizedLabel component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderLocalizedLabel( props = {}, options = {} ) {
		return shallowMount( LocalizedLabel, { props, ...options } );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangZid = 'Z1002';
		store.getLanguageIsoCodeOfZLang = createGettersWithFunctionsMock( 'ES' );
	} );

	describe( 'when user lang and label lang match', () => { // isUserLang is true
		const englishLabel = new LabelData( 'Z1K1', 'type', 'Z1002', 'en' );

		it( 'renders without errors', () => {
			const wrapper = renderLocalizedLabel( {
				labelData: englishLabel
			} );

			expect( wrapper.find( 'label' ).exists() ).toBe( true );
			expect( wrapper.get( 'label' ).text() ).toContain( 'type' );
		} );

		it( 'hides the language chip', () => {
			const wrapper = renderLocalizedLabel( {
				labelData: englishLabel
			} );

			expect( wrapper.find( '.ext-wikilambda-app-localized-label__chip' ).exists() ).toBe( false );
		} );
	} );

	describe( 'when user lang and local label do not match', () => { // isUserLang is false
		const spanishLabel = new LabelData( 'Z1K1', 'tipo', 'Z1003', 'es' );

		it( 'renders without errors', () => {
			const wrapper = renderLocalizedLabel( {
				labelData: spanishLabel
			} );

			expect( wrapper.find( 'label' ).exists() ).toBe( true );
			expect( wrapper.get( 'label' ).text() ).toContain( 'tipo' );
		} );

		it( 'shows a language chip', () => {
			const wrapper = renderLocalizedLabel( {
				labelData: spanishLabel
			} );

			expect( wrapper.find( '.ext-wikilambda-app-localized-label__chip' ).exists() ).toBe( true );
			expect( wrapper.get( '.ext-wikilambda-app-localized-label__chip' ).text() ).toBe( 'es' );
		} );
	} );
} );
