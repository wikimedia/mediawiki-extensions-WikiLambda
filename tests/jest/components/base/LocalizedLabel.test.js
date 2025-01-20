/*!
 * WikiLambda unit test suite for the default LocalizedLabel component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	LabelData = require( '../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' ),
	useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' ),
	LocalizedLabel = require( '../../../../resources/ext.wikilambda.app/components/base/LocalizedLabel.vue' );

describe( 'LocalizedLabel', () => {
	let store;
	beforeEach( () => {
		store = useMainStore();
		store.getUserLangZid = 'Z1002';
		store.getLanguageIsoCodeOfZLang = createGettersWithFunctionsMock( 'ES' );
	} );

	describe( 'when user lang and label lang match', () => { // isUserLang is true
		const englishLabel = new LabelData( 'Z1K1', 'type', 'Z1002', 'en' );

		it( 'renders without errors', () => {
			const wrapper = shallowMount( LocalizedLabel, {
				props: {
					labelData: englishLabel
				}
			} );

			expect( wrapper.find( 'label' ).exists() ).toBe( true );
			expect( wrapper.find( 'label' ).text() ).toContain( 'type' );
		} );

		it( 'hides the language chip', () => {
			const wrapper = shallowMount( LocalizedLabel, {
				props: {
					labelData: englishLabel
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-localized-label__chip' ).exists() ).toBe( false );
		} );
	} );

	describe( 'when user lang and local label do not match', () => { // isUserLang is false
		const spanishLabel = new LabelData( 'Z1K1', 'tipo', 'Z1003', 'es' );

		it( 'renders without errors', () => {
			const wrapper = shallowMount( LocalizedLabel, {
				props: {
					labelData: spanishLabel
				}
			} );

			expect( wrapper.find( 'label' ).exists() ).toBe( true );
			expect( wrapper.find( 'label' ).text() ).toContain( 'tipo' );
		} );

		it( 'shows a language chip', () => {
			const wrapper = shallowMount( LocalizedLabel, {
				props: {
					labelData: spanishLabel
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-localized-label__chip' ).exists() ).toBe( true );
			expect( wrapper.find( '.ext-wikilambda-app-localized-label__chip' ).text() ).toBe( 'es' );
		} );
	} );
} );
