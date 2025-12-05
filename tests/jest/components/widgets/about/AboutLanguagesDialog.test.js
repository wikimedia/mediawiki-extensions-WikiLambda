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

	function renderAboutLanguagesDialog( props = {}, options = {} ) {
		const defaultProps = {
			open: true
		};
		const defaultOptions = {
			global: {
				stubs: {
					...dialogGlobalStubs,
					...options?.stubs
				}
			}
		};
		return mount( AboutLanguagesDialog, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	}

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
		const wrapper = renderAboutLanguagesDialog();
		expect( wrapper.find( '.ext-wikilambda-app-about-languages-dialog' ).exists() ).toBe( true );
	} );

	it( 'renders language search box', () => {
		const wrapper = renderAboutLanguagesDialog();
		expect( wrapper.find( '.ext-wikilambda-app-about-languages-dialog__search' ).exists() ).toBe( true );
	} );

	it( 'renders user language and fallback chain under "Suggested languages"', () => {
		const wrapper = renderAboutLanguagesDialog();

		// Find the suggested languages section
		const sections = wrapper.findAll( '.ext-wikilambda-app-about-languages-dialog__group' );
		const suggestedSection = sections.find( ( section ) => {
			const title = section.find( '.ext-wikilambda-app-about-languages-dialog__group-title' );
			return title.exists() && title.text().includes( 'Suggested languages' );
		} );
		expect( suggestedSection.exists() ).toBe( true );

		// Find items in the suggested section
		const items = suggestedSection.findAll( '.ext-wikilambda-app-about-languages-dialog__item' );
		// Spanish
		expect( items[ 0 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Español' );
		expect( items[ 0 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field' ).text() ).toBe( 'Nombre' );
		expect( items[ 0 ].find( '.ext-wikilambda-app-about-languages-dialog__item-untitled' ).exists() ).toBe( false );
		// English
		expect( items[ 1 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'English' );
		expect( items[ 1 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field' ).text() ).toBe( 'Name' );
		expect( items[ 1 ].find( '.ext-wikilambda-app-about-languages-dialog__item-untitled' ).exists() ).toBe( false );
	} );

	it( 'renders other available languages under "Other languages"', () => {
		const wrapper = renderAboutLanguagesDialog();

		// Find the other languages section
		const sections = wrapper.findAll( '.ext-wikilambda-app-about-languages-dialog__group' );
		const otherSection = sections.find( ( section ) => {
			const title = section.find( '.ext-wikilambda-app-about-languages-dialog__group-title' );
			return title.exists() && title.text().includes( 'Other languages' );
		} );
		expect( otherSection.exists() ).toBe( true );

		// Find items in the other section
		const items = otherSection.findAll( '.ext-wikilambda-app-about-languages-dialog__item' );
		// Croatian
		expect( items[ 0 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Croatian' );
		expect( items[ 0 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field' ).text() ).toBe( 'Untitled' );
		expect( items[ 0 ].find( '.ext-wikilambda-app-about-languages-dialog__item-untitled' ).exists() ).toBe( true );
		// Euskera
		expect( items[ 1 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Euskera' );
		expect( items[ 1 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field' ).text() ).toBe( 'Izena' );
		expect( items[ 1 ].find( '.ext-wikilambda-app-about-languages-dialog__item-untitled' ).exists() ).toBe( false );
		// Italian
		expect( items[ 2 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Italian' );
		expect( items[ 2 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field' ).text() ).toBe( 'Untitled' );
		expect( items[ 2 ].find( '.ext-wikilambda-app-about-languages-dialog__item-untitled' ).exists() ).toBe( true );
		// Quechua
		expect( items[ 3 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Quechua' );
		expect( items[ 3 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field' ).text() ).toBe( 'Suti' );
		expect( items[ 3 ].find( '.ext-wikilambda-app-about-languages-dialog__item-untitled' ).exists() ).toBe( false );
		// Telugu
		expect( items[ 4 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Telugu' );
		expect( items[ 4 ].find( '.ext-wikilambda-app-about-languages-dialog__item-field' ).text() ).toBe( 'Untitled' );
		expect( items[ 4 ].find( '.ext-wikilambda-app-about-languages-dialog__item-untitled' ).exists() ).toBe( true );
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

		const wrapper = renderAboutLanguagesDialog( {
			open: true
		} );

		// Find the other languages section
		const sections = wrapper.findAll( '.ext-wikilambda-app-about-languages-dialog__group' );
		const otherSection = sections.find( ( section ) => {
			const title = section.find( '.ext-wikilambda-app-about-languages-dialog__group-title' );
			return title.exists() && title.text().includes( 'Other languages' );
		} );
		expect( otherSection.exists() ).toBe( true );

		// Find items in the other section
		const items = otherSection.findAll( '.ext-wikilambda-app-about-languages-dialog__item' );
		// The fallback languages (English and Español) have been removed from "Other languages".
		// The remaining languages (by their zids) are: Z1314 (Euskera), Z1678 (Quechua),
		// Z1787 (Italian), Z1272 (croatian), and Z1429 (Telugu).
		// When sorted case-insensitively, the expected order is:
		// "croatian", "Euskera", "Italian", "Quechua", "Telugu"
		expect( items[ 0 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'croatian' );
		expect( items[ 1 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Euskera' );
		expect( items[ 2 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Italian' );
		expect( items[ 3 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Quechua' );
		expect( items[ 4 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Telugu' );
	} );

	it( 'triggers language lookup when writing in the search box', async () => {
		store.lookupZObjectLabels.mockResolvedValue( mockLookupLanguages );

		const wrapper = renderAboutLanguagesDialog();

		const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
		searchInput.vm.$emit( 'update:modelValue', 'Chin' );

		// Wait until lookup results are rendered
		await waitFor( () => {
			expect( wrapper.findAll( '.ext-wikilambda-app-about-languages-dialog__item' ).length ).toBe( 3 );
		} );

		// Shows the lookup results:
		const items = wrapper.findAll( '.ext-wikilambda-app-about-languages-dialog__item' );
		expect( items[ 0 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Chinese' );
		expect( items[ 0 ].find( '.ext-wikilambda-app-about-languages-dialog__item-add-language' ).text() ).toBe( 'Add language' );
		expect( items[ 1 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Kachin' );
		expect( items[ 1 ].find( '.ext-wikilambda-app-about-languages-dialog__item-add-language' ).text() ).toBe( 'Add language' );
		expect( items[ 2 ].find( '.ext-wikilambda-app-about-languages-dialog__item-title' ).text() ).toBe( 'Wu Chinese' );
		expect( items[ 2 ].find( '.ext-wikilambda-app-about-languages-dialog__item-add-language' ).text() ).toBe( 'Add language' );

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
		const wrapper = renderAboutLanguagesDialog();

		const items = wrapper.findAll( '.ext-wikilambda-app-about-languages-dialog__item' );

		// ACT: click on Euskera item button
		const language = items[ 3 ];
		expect( language.text() ).toContain( 'Euskera' );
		const button = language.find( 'button' );
		expect( button.exists() ).toBe( true );
		button.trigger( 'click' );

		// ASSERT: event open-edit-language is emitted with the right data
		expect( wrapper.emitted() ).toHaveProperty( 'add-language', [ [ 'Z1314' ] ] );
	} );
} );
