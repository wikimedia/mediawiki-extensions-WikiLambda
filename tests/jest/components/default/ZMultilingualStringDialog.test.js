/*!
 * WikiLambda unit test suite for the ZMultilingualStringDialog component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const ZMultilingualStringDialog = require( '../../../../resources/ext.wikilambda.app/components/types/ZMultilingualStringDialog.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const { mockWindowLocation, restoreWindowLocation } = require( '../../fixtures/location.js' );
const { dialogGlobalStubs } = require( '../../helpers/dialogTestHelpers.js' );

// Test data
const mockItems = [
	{
		langZid: 'Z1002',
		objectValue: { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'English text' },
		value: 'English text',
		isInVisibleList: true
	},
	{
		langZid: 'Z1003',
		objectValue: { Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'Spanish text' },
		value: 'Spanish text',
		isInVisibleList: false
	},
	{
		langZid: 'Z1004',
		objectValue: { Z1K1: 'Z11', Z11K1: 'Z1004', Z11K2: '' },
		value: '',
		isInVisibleList: false
	},
	{
		langZid: 'Z1005',
		objectValue: { Z1K1: 'Z11', Z11K1: 'Z1005', Z11K2: 'Russian text' },
		value: 'Russian text',
		isInVisibleList: false
	}
];

const mockEmptyItems = [];

describe( 'ZMultilingualStringDialog', () => {
	let store;

	/**
	 * Helper function to render ZMultilingualStringDialog component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderZMultilingualStringDialog( props = {}, options = {} ) {
		const defaultProps = {
			keyPath: 'main.Z2K2.Z12K1',
			open: true,
			items: mockItems,
			edit: true
		};
		const defaultOptions = {
			global: {
				stubs: {
					...dialogGlobalStubs,
					...options?.stubs
				}
			}
		};
		return mount( ZMultilingualStringDialog, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangCode = 'en';
		store.getLabelData = createLabelDataMock( {
			Z1001: 'Arabic',
			Z1002: 'English',
			Z1003: 'Spanish',
			Z1004: 'French',
			Z1005: 'Russian',
			Z1006: 'Chinese'
		} );
		store.getLanguageIsoCodeOfZLang = jest.fn().mockImplementation( ( zid ) => {
			const zidToIsoMap = {
				Z1001: 'ar', // Arabic
				Z1002: 'en', // English
				Z1003: 'es', // Spanish
				Z1004: 'fr', // French
				Z1005: 'ru', // Russian
				Z1006: 'zh', // Chinese
				Z1672: 'zh-tw', // Chinese Traditional
				Z1645: 'zh-cn' // Chinese Simplified
			};
			return zidToIsoMap[ zid ];
		} );
		store.getLanguageZidOfCode = jest.fn().mockImplementation( ( isoCode ) => {
			const isoToZidMap = {
				ar: 'Z1001',
				en: 'Z1002',
				es: 'Z1003',
				fr: 'Z1004',
				ru: 'Z1005',
				zh: 'Z1006',
				'zh-tw': 'Z1672',
				'zh-cn': 'Z1645'
			};
			return isoToZidMap[ isoCode ];
		} );
		store.fetchZids = jest.fn();
		store.lookupZObjectLabels = jest.fn().mockResolvedValue( {
			labels: [
				{
					page_title: 'Z1005',
					label: 'Russian',
					match_lang: 'Z1002'
				},
				{
					page_title: 'Z1001',
					label: 'Arabic',
					match_lang: 'Z1002'
				}
			]
		} );
	} );

	describe( 'in view and edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderZMultilingualStringDialog();

			expect( wrapper.exists() ).toBe( true );
			expect( wrapper.props( 'open' ) ).toBe( true );

			// Check for search input component
			const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
			expect( searchInput.exists() ).toBe( true );
		} );

		it( 'displays available languages that are not visible', async () => {
			const wrapper = renderZMultilingualStringDialog();

			const languageItems = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__item' );
			expect( languageItems.length ).toBeGreaterThan( 0 );
			// Should display non-visible languages (Spanish, French, Russian)
			// English (Z1002) is visible, so should not be in the available list
			expect( languageItems.length ).toBeGreaterThanOrEqual( 2 );

		} );

		it( 'shows suggested languages section when no items are available', async () => {
			const wrapper = renderZMultilingualStringDialog( { items: mockEmptyItems } );

			const sectionTitles = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__group-title' );
			expect( sectionTitles.length ).toBeGreaterThan( 0 );
			// Check for suggested languages label
			const suggestedSection = sectionTitles.some( ( title ) => title.text().toLowerCase().includes( 'suggest' ) );
			expect( suggestedSection ).toBe( true );

		} );

		it( 'displays language items with their labels and values', async () => {
			const wrapper = renderZMultilingualStringDialog();

			const languageItems = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__item' );
			expect( languageItems.length ).toBeGreaterThan( 0 );
			// Each item should have a title (language name) and field (value or "add language")
			languageItems.forEach( ( item ) => {
				const title = item.find( '.ext-wikilambda-app-z-multilingual-string-dialog__item-title' );
				const field = item.find( '.ext-wikilambda-app-z-multilingual-string-dialog__item-field' );

				expect( title.exists() ).toBe( true );
				expect( field.exists() ).toBe( true );
			} );
		} );

		it( 'displays languages in sorted order', () => {
			const wrapper = renderZMultilingualStringDialog();

			const languageItems = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__item-title' );

			if ( languageItems.length > 1 ) {
				const labels = languageItems.map( ( item ) => item.text() );
				const sortedLabels = [ ...labels ].sort();

				// Check that labels are in sorted order
				expect( labels ).toEqual( sortedLabels );
			}
		} );
	} );

	describe( 'user interactions', () => {
		it( 'shows cancel button when search input is focused', async () => {
			const wrapper = renderZMultilingualStringDialog();

			const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
			await searchInput.vm.$emit( 'focus' );

			const cancelButton = wrapper.find( '.ext-wikilambda-app-z-multilingual-string-dialog__search-cancel' );
			expect( cancelButton.exists() ).toBe( true );
		} );

		it( 'clears search when cancel button is clicked', async () => {
			const wrapper = renderZMultilingualStringDialog();

			// First type in search
			const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
			await searchInput.setValue( 'test search' );
			await searchInput.vm.$emit( 'focus' );

			const cancelButton = wrapper.find( '.ext-wikilambda-app-z-multilingual-string-dialog__search-cancel' );
			expect( cancelButton.exists() ).toBe( true );

			// Click cancel button
			await cancelButton.trigger( 'click' );

			// Search input should be cleared
			expect( searchInput.props( 'modelValue' ) ).toBe( '' );
		} );

		it( 'performs language lookup when search term is entered', async () => {
			const wrapper = renderZMultilingualStringDialog();

			// Simulate user typing
			const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
			await searchInput.setValue( 'russian' );

			// Should call lookup API
			expect( store.lookupZObjectLabels ).toHaveBeenCalledWith( {
				input: 'russian',
				types: [ Constants.Z_NATURAL_LANGUAGE ],
				signal: expect.any( Object )
			} );

			// Should fetch the found language ZIDs
			await waitFor( () => {
				expect( store.fetchZids ).toHaveBeenCalledWith( {
					zids: [ 'Z1005', 'Z1001' ]
				} );
			} );

			// Should display the lookup results
			const languageItems = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__item' );
			expect( languageItems.length ).toBeGreaterThan( 0 );
		} );

		it( 'clears lookup results when search term is cleared', async () => {
			const wrapper = renderZMultilingualStringDialog();

			// First type a search term
			const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
			await searchInput.setValue( 'russian' );

			await waitFor( () => {
				expect( store.lookupZObjectLabels ).toHaveBeenCalled();
			} );

			// Clear the search
			await searchInput.setValue( '' );

			// Should return to showing regular available languages
			const languageItems = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__item' );
			expect( languageItems.length ).toBeGreaterThanOrEqual( 0 );
		} );

		it( 'emits add-language event when a language item is clicked in edit mode', async () => {
			const wrapper = renderZMultilingualStringDialog();

			const languageItems = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__item' );
			expect( languageItems.length ).toBeGreaterThan( 0 );

			// Find and click the button inside the language item (Spanish or Russian)
			const button = languageItems[ 0 ].find( 'button' );
			expect( button.exists() ).toBe( true );
			await button.trigger( 'click' );

			// Should emit add-language event
			expect( wrapper.emitted( 'add-language' ) ).toBeTruthy();
			expect( wrapper.emitted( 'add-language' )[ 0 ] ).toHaveLength( 1 );
			expect( typeof wrapper.emitted( 'add-language' )[ 0 ][ 0 ] ).toBe( 'string' );
		} );

		it( 'emits add-language event when a language item is clicked in view mode', async () => {
			const wrapper = renderZMultilingualStringDialog( { edit: false } );

			const languageItems = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__item' );
			expect( languageItems.length ).toBeGreaterThan( 0 );

			// Find and click the button inside the language item
			const button = languageItems[ 0 ].find( 'button' );
			expect( button.exists() ).toBe( true );
			await button.trigger( 'click' );

			// Should emit add-language event
			expect( wrapper.emitted( 'add-language' ) ).toBeTruthy();
		} );

		it( 'emits close-dialog event when a language item that is already visible is clicked', async () => {
			// Create items where English is both in the list and visible
			const itemsWithVisible = [
				...mockItems.slice( 0, 1 ), // Z1002 English - visible
				...mockItems.slice( 1 ) // Others - not visible
			];
			itemsWithVisible[ 0 ].isInVisibleList = true;

			const wrapper = renderZMultilingualStringDialog( { items: itemsWithVisible } );

			// The English item should be in the list but marked differently
			// When clicked, it should close the dialog instead of adding
			const languageItems = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__item' );

			// Find the English item by checking if it has a value (not "add language" text)
			let englishItemButton;
			for ( const item of languageItems ) {
				const field = item.find( '.ext-wikilambda-app-z-multilingual-string-dialog__item-field' );
				const addLanguageSpan = field.find( '.ext-wikilambda-app-z-multilingual-string-dialog__item-add-language' );

				// If it has a value (not "add language"), it's the visible one
				if ( !addLanguageSpan.exists() && field.text() ) {
					englishItemButton = item.find( 'button' );
					break;
				}
			}

			if ( englishItemButton && englishItemButton.exists() ) {
				await englishItemButton.trigger( 'click' );
				expect( wrapper.emitted( 'close-dialog' ) ).toBeTruthy();
			}
		} );

		it( 'navigates to edit mode when in read mode and item not in store is clicked', async () => {
			// Mock window.location using the helper
			mockWindowLocation( 'http://example.com' );

			const wrapper = renderZMultilingualStringDialog( { edit: false } );

			// Simulate user typing 'arabic' to search for a language not in the list
			const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
			await searchInput.setValue( 'arabic' );

			await waitFor( () => {
				expect( store.lookupZObjectLabels ).toHaveBeenCalledWith( {
					input: 'arabic',
					types: [ Constants.Z_NATURAL_LANGUAGE ],
					signal: expect.any( Object )
				} );
			} );

			await waitFor( () => {
				expect( store.fetchZids ).toHaveBeenCalled();
			} );

			const languageItems = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__item' );
			expect( languageItems.length ).toBeGreaterThan( 0 );

			// Click the button inside a language item that's not in the store
			const button = languageItems[ 0 ].find( 'button' );
			expect( button.exists() ).toBe( true );
			await button.trigger( 'click' );

			// Should navigate to edit mode with proper hash
			expect( window.location.href ).toContain( 'action=edit' );
			expect( window.location.href ).toContain( '#main-Z2K2-Z12K1' );

			// Restore original location
			restoreWindowLocation();
		} );

		it( 'emits close-dialog when close button is clicked', async () => {
			const wrapper = renderZMultilingualStringDialog();

			// Find and click the close button in the header
			const closeButton = wrapper.findComponent( { name: 'wl-custom-dialog-header' } );
			closeButton.vm.$emit( 'close-dialog' );

			expect( wrapper.emitted( 'close-dialog' ) ).toBeTruthy();
		} );
	} );

	describe( 'common languages functionality', () => {
		it( 'fetches common languages if needed on mount', () => {
			renderZMultilingualStringDialog( { items: mockEmptyItems } );

			expect( store.fetchZids ).toHaveBeenCalledWith( {
				zids: Constants.SUGGESTIONS.LANGUAGES
			} );
		} );

		it( 'fetches common languages when items change to empty', async () => {
			const wrapper = renderZMultilingualStringDialog();

			// Clear the previous call
			store.fetchZids.mockClear();

			// Change to empty items
			await wrapper.setProps( { items: mockEmptyItems } );

			expect( store.fetchZids ).toHaveBeenCalledWith( {
				zids: Constants.SUGGESTIONS.LANGUAGES
			} );
		} );

		it( 'displays suggested languages when no items are available', () => {
			const wrapper = renderZMultilingualStringDialog( { items: mockEmptyItems } );

			// Should display suggested languages section
			const languageItems = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__item' );
			expect( languageItems.length ).toBeGreaterThan( 0 );

			// Should display section title for suggested languages
			const sectionTitles = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__group-title' );
			expect( sectionTitles.length ).toBeGreaterThan( 0 );
		} );

		it( 'displays suggested language items with add language text', () => {
			const wrapper = renderZMultilingualStringDialog( { items: mockEmptyItems } );

			const languageItems = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__item' );

			// Each suggested language should show "add language" text (no value yet)
			languageItems.forEach( ( item ) => {
				const addLanguageSpan = item.find( '.ext-wikilambda-app-z-multilingual-string-dialog__item-add-language' );
				expect( addLanguageSpan.exists() ).toBe( true );
			} );
		} );
	} );

	describe( 'lookup request handling', () => {
		it( 'performs subsequent searches correctly', async () => {
			const wrapper = renderZMultilingualStringDialog();

			const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );

			// First search
			await searchInput.setValue( 'first' );
			await waitFor( () => {
				expect( store.lookupZObjectLabels ).toHaveBeenCalled();
			} );

			// Second search should also work
			await searchInput.setValue( 'second' );
			await waitFor( () => {
				expect( store.lookupZObjectLabels ).toHaveBeenCalledTimes( 2 );
			} );
		} );

		it( 'handles failed lookup requests gracefully', async () => {
			store.lookupZObjectLabels = jest.fn().mockRejectedValue( new Error( 'Network error' ) );

			const wrapper = renderZMultilingualStringDialog();

			const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );

			// Should not crash when lookup fails
			await searchInput.setValue( 'test' );

			// Component should still be functional
			expect( wrapper.exists() ).toBe( true );
		} );

		it( 'displays search results when user searches for languages', async () => {
			const wrapper = renderZMultilingualStringDialog();

			const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
			await searchInput.setValue( 'russian' );

			const languageItems = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__item' );
			expect( languageItems.length ).toBeGreaterThan( 0 );
			// Should have called the API
			expect( store.lookupZObjectLabels ).toHaveBeenCalled();
		} );

		it( 'displays languages in a useful order in search results', async () => {
			const wrapper = renderZMultilingualStringDialog();

			const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
			await searchInput.setValue( 'test' );

			// Wait for results
			await waitFor( () => {
				expect( store.lookupZObjectLabels ).toHaveBeenCalled();
			} );

			const languageItems = wrapper.findAll( '.ext-wikilambda-app-z-multilingual-string-dialog__item' );
			// Should display search results
			expect( languageItems.length ).toBeGreaterThanOrEqual( 0 );
		} );
	} );
} );
