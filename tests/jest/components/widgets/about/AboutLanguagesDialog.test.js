/*!
 * WikiLambda unit test suite for About View Languages Dialog
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const { dialogGlobalStubs } = require( '../../../helpers/dialogTestHelpers.js' );
const { createLabelDataMock } = require( '../../../helpers/getterHelpers.js' );
const { mockLookupLanguages } = require( '../../../fixtures/mocks.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const AboutLanguagesDialog = require( '../../../../../resources/ext.wikilambda.app/components/widgets/about/AboutLanguagesDialog.vue' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );

// Note: Using custom teleport stub to render content inline instead of teleporting to document body
// This allows us to test dialog content within the component wrapper
// see https://test-utils.vuejs.org/guide/advanced/teleport.html

describe( 'AboutLanguagesDialog', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getFallbackLanguageZids = [ 'Z1003', 'Z1002' ];
		store.getLanguageIsoCodeOfZLang = ( langZid ) => {
			const codes = {
				Z1002: 'en', // English
				Z1003: 'es', // Spanish
				Z1314: 'eu', // Euskera
				Z1678: 'qu', // Quechua
				Z1787: 'it', // Italian
				Z1272: 'hr', // Croatian
				Z1429: 'te' // Telugu
			};
			return codes[ langZid ];
		};
		store.getMultilingualDataLanguages = { all: [
			'Z1002', // English
			'Z1003', // Spanish
			'Z1314', // Euskera
			'Z1678', // Quechua
			'Z1787', // Italian
			'Z1272', // Croatian
			'Z1429' // Telugu
		] };
		store.getZPersistentName = ( langZid ) => {
			const names = {
				Z1002: { keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1', value: 'Name' },
				Z1003: { keyPath: 'main.Z2K3.Z12K1.2.Z11K2.Z6K1', value: 'Nombre' },
				Z1314: { keyPath: 'main.Z2K3.Z12K1.3.Z11K2.Z6K1', value: 'Izena' },
				Z1678: { keyPath: 'main.Z2K3.Z12K1.4.Z11K2.Z6K1', value: 'Suti' }
			};
			return names[ langZid ];
		};
		store.getLabelData = createLabelDataMock( {
			Z1002: 'English',
			Z1003: 'Español',
			Z1314: 'Euskera',
			Z1678: 'Quechua',
			Z1787: 'Italian',
			Z1272: 'Croatian',
			Z1429: 'Telugu'
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = mount( AboutLanguagesDialog, {
			props: {
				open: true
			},
			global: { stubs: dialogGlobalStubs }
		} );
		expect( wrapper.find( '.ext-wikilambda-app-about-languages-dialog' ).exists() ).toBe( true );
	} );

	it( 'renders language search box', () => {
		const wrapper = mount( AboutLanguagesDialog, {
			props: {
				open: true
			},
			global: { stubs: dialogGlobalStubs }
		} );
		expect( wrapper.find( '.ext-wikilambda-app-about-languages-dialog__search' ).exists() ).toBe( true );
	} );

	it( 'renders user language and fallback chain under "Suggested languages"', () => {
		const wrapper = mount( AboutLanguagesDialog, {
			props: {
				open: true
			},
			global: { stubs: dialogGlobalStubs }
		} );

		const list = wrapper.findAll( '.ext-wikilambda-app-about-languages-dialog__items > div' );

		// Suggested languages:
		expect( list[ 0 ].text() ).toContain( 'Suggested languages' );
		// Spanish
		expect( list[ 1 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Español' );
		expect( list[ 1 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field' ).text() ).toBe( 'Nombre' );
		expect( list[ 1 ].find( '.ext-wikilambda-app-about-languages-dialog__item-untitled' ).exists() ).toBe( false );
		// English
		expect( list[ 2 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'English' );
		expect( list[ 2 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field' ).text() ).toBe( 'Name' );
		expect( list[ 2 ].find( '.ext-wikilambda-app-about-languages-dialog__item-untitled' ).exists() ).toBe( false );
	} );

	it( 'renders other available languages under "Other languages"', () => {
		const wrapper = mount( AboutLanguagesDialog, {
			props: {
				open: true
			},
			global: { stubs: dialogGlobalStubs }
		} );

		const list = wrapper.findAll( '.ext-wikilambda-app-about-languages-dialog__items > div' );

		// Suggested languages:
		expect( list[ 3 ].text() ).toContain( 'Other languages' );
		// Croatian
		expect( list[ 4 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Croatian' );
		expect( list[ 4 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field' ).text() ).toBe( 'Untitled' );
		expect( list[ 4 ].find( '.ext-wikilambda-app-about-languages-dialog__item-untitled' ).exists() ).toBe( true );
		// Euskera
		expect( list[ 5 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Euskera' );
		expect( list[ 5 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field' ).text() ).toBe( 'Izena' );
		expect( list[ 5 ].find( '.ext-wikilambda-app-about-languages-dialog__item-untitled' ).exists() ).toBe( false );
		// Italian
		expect( list[ 6 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Italian' );
		expect( list[ 6 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field' ).text() ).toBe( 'Untitled' );
		expect( list[ 6 ].find( '.ext-wikilambda-app-about-languages-dialog__item-untitled' ).exists() ).toBe( true );
		// Quechua
		expect( list[ 7 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Quechua' );
		expect( list[ 7 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field' ).text() ).toBe( 'Suti' );
		expect( list[ 7 ].find( '.ext-wikilambda-app-about-languages-dialog__item-untitled' ).exists() ).toBe( false );
		// Telugu
		expect( list[ 8 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Telugu' );
		expect( list[ 8 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field' ).text() ).toBe( 'Untitled' );
		expect( list[ 8 ].find( '.ext-wikilambda-app-about-languages-dialog__item-untitled' ).exists() ).toBe( true );
	} );

	it( 'sorts other languages in a case-insensitive manner', () => {
		// Override getLabelData so that Croatian is intentionally lower-case
		const modifiedLabelData = {
			Z1002: 'English',
			Z1003: 'Español',
			Z1314: 'Euskera',
			Z1678: 'Quechua',
			Z1787: 'Italian',
			Z1272: 'croatian', // lowercase to test case insensitivity
			Z1429: 'Telugu'
		};
		store.getLabelData = createLabelDataMock( modifiedLabelData );

		const wrapper = mount( AboutLanguagesDialog, {
			props: { open: true },
			global: { stubs: dialogGlobalStubs }
		} );
		const list = wrapper.findAll( '.ext-wikilambda-app-about-languages-dialog__items > div' );

		// In the component, the first section ("Suggested languages") is rendered first,
		// followed by a header for "Other languages" (list[3]),
		// then the items for "Other languages" starting at list[4].
		// The fallback languages (English and Español) have been removed from "Other languages".
		// The remaining languages (by their zids) are: Z1314 (Euskera), Z1678 (Quechua),
		// Z1787 (Italian), Z1272 (croatian), and Z1429 (Telugu).
		// When sorted case-insensitively, the expected order is:
		// "croatian", "Euskera", "Italian", "Quechua", "Telugu"
		expect( list[ 4 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'croatian' );
		expect( list[ 5 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Euskera' );
		expect( list[ 6 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Italian' );
		expect( list[ 7 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Quechua' );
		expect( list[ 8 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Telugu' );
	} );

	it( 'triggers language lookup when writing in the search box', async () => {
		store.lookupZObjectLabels.mockResolvedValue( mockLookupLanguages );

		const wrapper = mount( AboutLanguagesDialog, {
			props: {
				open: true
			},
			global: { stubs: dialogGlobalStubs }
		} );

		const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
		searchInput.vm.$emit( 'update:modelValue', 'Chin' );

		// Wait until lookupResults has content
		await waitFor( () => expect( wrapper.vm.lookupResults.length ).not.toBe( 0 ) );

		// Shows the lookup results:
		const list = wrapper.findAll( '.ext-wikilambda-app-about-languages-dialog__items > div' );
		expect( list.length ).toBe( 3 );
		expect( list[ 0 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Chinese' );
		expect( list[ 0 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field>a' ).text() ).toBe( 'Add language' );
		expect( list[ 1 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Kachin' );
		expect( list[ 1 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field>a' ).text() ).toBe( 'Add language' );
		expect( list[ 2 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Wu Chinese' );
		expect( list[ 2 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field>a' ).text() ).toBe( 'Add language' );

		// Fetches additional language information:
		expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z1006', 'Z1219', 'Z1837' ] } );
		expect( store.lookupZObjectLabels ).toHaveBeenCalledWith(
			expect.objectContaining( {
				input: 'Chin',
				types: [ Constants.Z_NATURAL_LANGUAGE ]
			} )
		);
	} );

	it( 'emits add-language event when clicking on an item', () => {
		const wrapper = mount( AboutLanguagesDialog, {
			props: {
				open: true
			},
			global: { stubs: dialogGlobalStubs }
		} );

		const items = wrapper.findAll( '.ext-wikilambda-app-about-languages-dialog__item' );

		// ACT: click on Euskera item
		const language = items[ 3 ];
		expect( language.text() ).toContain( 'Euskera' );
		language.trigger( 'click' );

		// ASSERT: event open-edit-language is emitted with the right data
		expect( wrapper.emitted() ).toHaveProperty( 'add-language', [ [ 'Z1314' ] ] );
	} );
} );
