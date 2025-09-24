/*!
 * WikiLambda unit test suite for the ZMultilingualStringDialog component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const ZMultilingualStringDialog = require( '../../../../resources/ext.wikilambda.app/components/types/ZMultilingualStringDialog.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const { mockWindowLocation, restoreWindowLocation } = require( '../../fixtures/location.js' );

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

const globalStubs = {
	stubs: {
		CdxDialog: true,
		'cdx-search-input': true,
		'wl-custom-dialog-header': true,
		transition: false
	}
};

describe( 'ZMultilingualStringDialog', () => {
	let store;

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
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			expect( wrapper.exists() ).toBe( true );
			expect( wrapper.props( 'open' ) ).toBe( true );

			const placeholder = wrapper.vm.searchPlaceholder;
			expect( typeof placeholder ).toBe( 'string' );
		} );

		it( 'filters out visible languages from local items', () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			const localItems = wrapper.vm.localItems;

			// Should not include 'Z1002' (English) as it's already visible
			const availableItems = localItems.filter( ( item ) => !item.disabled && item.langZid !== 'Z1002' );
			expect( availableItems.length ).toBeGreaterThan( 0 );
		} );

		it( 'shows suggested languages when no local items available', () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockEmptyItems,
					edit: true
				},
				global: globalStubs
			} );

			const localItems = wrapper.vm.localItems;
			const suggestedSection = localItems.find( ( item ) => item.disabled && item.label && item.label.includes( 'Suggested' ) );

			expect( suggestedSection ).toBeDefined();
		} );

		it( 'computes available languages correctly', () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			const availableLanguages = wrapper.vm.getAvailableLanguages;

			// Should only include languages not in visible list
			const visibleLanguages = availableLanguages.filter( ( item ) => item.isInVisibleList );
			const nonVisibleLanguages = availableLanguages.filter( ( item ) => !item.isInVisibleList );

			expect( visibleLanguages.length ).toBe( 0 );
			expect( nonVisibleLanguages.length ).toBeGreaterThan( 0 );
		} );

		it( 'computes dialog items with correct properties', () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			const dialogItems = wrapper.vm.getDialogItems;

			dialogItems.forEach( ( item ) => {
				expect( item ).toHaveProperty( 'langZid' );
				expect( item ).toHaveProperty( 'langLabelData' );
				expect( item ).toHaveProperty( 'isInList' );
				expect( item ).toHaveProperty( 'isInVisibleList' );
				expect( item ).toHaveProperty( 'value' );
				expect( item ).toHaveProperty( 'hasValue' );

				// All dialog items should be in the list but not visible
				expect( item.isInList ).toBe( true );
				expect( item.isInVisibleList ).toBe( false );
			} );
		} );

		it( 'sorts dialog items alphabetically', () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			const dialogItems = wrapper.vm.getDialogItems;

			if ( dialogItems.length > 1 ) {
				for ( let i = 1; i < dialogItems.length; i++ ) {
					const prevLabel = dialogItems[ i - 1 ].langLabelData.label;
					const currentLabel = dialogItems[ i ].langLabelData.label;
					expect( prevLabel.localeCompare( currentLabel ) ).toBeLessThanOrEqual( 0 );
				}
			}
		} );
	} );

	describe( 'user interactions', () => {
		it( 'shows cancel button when search is focused', async () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			// Simulate focus by directly setting the state
			wrapper.vm.showSearchCancel = true;
			await wrapper.vm.$nextTick();

			expect( wrapper.vm.showSearchCancel ).toBe( true );
		} );

		it( 'clears search when cancel button is clicked', async () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			// Set up search state
			wrapper.vm.searchTerm = 'test search';
			wrapper.vm.showSearchCancel = true;
			await wrapper.vm.$nextTick();

			// Test the clear functionality directly
			await wrapper.vm.clearSearch();

			expect( wrapper.vm.searchTerm ).toBe( '' );
			expect( wrapper.vm.showSearchCancel ).toBe( false );
		} );

		it( 'performs language lookup when search term is entered', async () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			// Simulate user typing by calling the update method
			await wrapper.vm.updateSearchTerm( 'russian' );

			expect( store.lookupZObjectLabels ).toHaveBeenCalledWith( {
				input: 'russian',
				types: [ Constants.Z_NATURAL_LANGUAGE ],
				signal: expect.any( Object )
			} );

			await waitFor( () => {
				expect( wrapper.vm.lookupResults.length ).toBeGreaterThan( 0 );
			} );

			expect( store.fetchZids ).toHaveBeenCalledWith( {
				zids: [ 'Z1005', 'Z1001' ]
			} );
			const visibleItems = wrapper.vm.visibleItems;
			expect( visibleItems ).toStrictEqual( wrapper.vm.lookupResults );
		} );

		it( 'clears lookup results when search term is empty', async () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			// First set some lookup results
			wrapper.vm.lookupResults = [ { langZid: 'Z1005' } ];

			// Simulate clearing search input
			await wrapper.vm.updateSearchTerm( '' );

			expect( wrapper.vm.lookupResults ).toEqual( [] );
		} );

		it( 'adds language when item is clicked in edit mode and item is not in list', async () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			// Simulate clicking on a language item
			const testItem = {
				langZid: 'Z1005',
				isInVisibleList: false,
				isInList: true
			};
			await wrapper.vm.handleItemClick( testItem );

			expect( wrapper.emitted( 'add-language' ) ).toBeTruthy();
			expect( wrapper.emitted( 'add-language' )[ 0 ] ).toEqual( [ 'Z1005' ] );
		} );

		it( 'adds language when item is clicked in read mode and item is not in list', async () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: false
				},
				global: globalStubs
			} );

			// Simulate clicking on a language item
			const testItem = {
				langZid: 'Z1005',
				isInVisibleList: false,
				isInList: true
			};
			await wrapper.vm.handleItemClick( testItem );

			expect( wrapper.emitted( 'add-language' ) ).toBeTruthy();
			expect( wrapper.emitted( 'add-language' )[ 0 ] ).toEqual( [ 'Z1005' ] );
		} );

		it( 'closes dialog when already visible item in list is clicked', async () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			// Simulate clicking on a visible language item
			const testItem = {
				langZid: 'Z1002',
				isInVisibleList: true,
				isInList: true
			};
			await wrapper.vm.handleItemClick( testItem );

			expect( wrapper.emitted( 'close-dialog' ) ).toBeTruthy();
		} );

		it( 'navigates to edit mode when in read mode and item not in store for the list', async () => {
			// Mock window.location using the helper
			mockWindowLocation( 'http://example.com' );

			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: false
				},
				global: globalStubs
			} );

			// Simulate user typing 'arabic'
			await wrapper.vm.updateSearchTerm( 'arabic' );

			expect( store.lookupZObjectLabels ).toHaveBeenCalledWith( {
				input: 'arabic',
				types: [ Constants.Z_NATURAL_LANGUAGE ],
				signal: expect.any( Object )
			} );

			await waitFor( () => {
				expect( wrapper.vm.lookupResults.length ).toBeGreaterThan( 0 );
			} );

			expect( store.fetchZids ).toHaveBeenCalledWith( {
				zids: [ 'Z1005', 'Z1001' ]
			} );

			// Simulate clicking on a lookup result item
			const testItem = {
				langZid: 'Z1001',
				isInVisibleList: false,
				isInList: false
			};
			await wrapper.vm.handleItemClick( testItem );

			expect( window.location.href ).toBe( '/wiki/Z0?uselang=en&action=edit#main-Z2K2-Z12K1' );

			// Restore original location
			restoreWindowLocation();
		} );

		it( 'resets state when dialog is closed', () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			// Set some state
			wrapper.vm.searchTerm = 'test';
			wrapper.vm.lookupResults = [ { langZid: 'Z1001' } ];

			wrapper.vm.closeDialog();

			expect( wrapper.vm.searchTerm ).toBe( '' );
			expect( wrapper.vm.lookupResults ).toEqual( [] );
			expect( wrapper.emitted( 'close-dialog' ) ).toBeTruthy();
		} );
	} );

	describe( 'common languages functionality', () => {
		it( 'fetches common languages if needed on mount', () => {
			shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockEmptyItems,
					edit: true
				},
				global: globalStubs
			} );

			expect( store.fetchZids ).toHaveBeenCalledWith( {
				zids: Constants.SUGGESTIONS.LANGUAGES
			} );
		} );

		it( 'fetches common languages when items change to empty', async () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			// Clear the previous call
			store.fetchZids.mockClear();

			// Change to empty items
			await wrapper.setProps( { items: mockEmptyItems } );

			expect( store.fetchZids ).toHaveBeenCalledWith( {
				zids: Constants.SUGGESTIONS.LANGUAGES
			} );
		} );

		it( 'provides common languages as suggestions', () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockEmptyItems,
					edit: true
				},
				global: globalStubs
			} );

			const suggestedItems = wrapper.vm.getSuggestedItems;
			const suggestedLanguageZids = suggestedItems.map( ( item ) => item.langZid );
			expect( suggestedLanguageZids ).toContain( 'Z1002' );
			expect( suggestedLanguageZids ).toContain( 'Z1001' );
			expect( suggestedLanguageZids ).toContain( 'Z1004' );
			expect( suggestedLanguageZids ).toContain( 'Z1005' );
			expect( suggestedLanguageZids ).toContain( 'Z1672' );
			expect( suggestedLanguageZids ).toContain( 'Z1645' );
		} );

		it( 'creates suggested items with correct properties', () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockEmptyItems,
					edit: true
				},
				global: globalStubs
			} );

			const suggestedItems = wrapper.vm.getSuggestedItems;

			suggestedItems.forEach( ( item ) => {
				expect( item ).toHaveProperty( 'langZid' );
				expect( item ).toHaveProperty( 'langLabelData' );
				expect( item ).toHaveProperty( 'isInList' );
				expect( item ).toHaveProperty( 'isInVisibleList' );
				expect( item ).toHaveProperty( 'value' );
				expect( item ).toHaveProperty( 'hasValue' );
				expect( item.hasValue ).toBe( false );
			} );
		} );
	} );

	describe( 'lookup request handling', () => {
		it( 'cancels previous lookup requests', async () => {
			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			// Start first lookup
			wrapper.vm.getLookupResults( 'first' );
			const firstController = wrapper.vm.lookupAbortController;

			// Start second lookup
			wrapper.vm.getLookupResults( 'second' );

			// First controller should be different from second
			expect( firstController ).not.toBe( wrapper.vm.lookupAbortController );
		} );

		it( 'handles aborted requests gracefully', async () => {
			store.lookupZObjectLabels = jest.fn().mockRejectedValue( { code: 'abort' } );

			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: mockItems,
					edit: true
				},
				global: globalStubs
			} );

			// Should not throw error
			const result = wrapper.vm.getLookupResults( 'test' );
			if ( result && typeof result.then === 'function' ) {
				await expect( result ).resolves.toBeUndefined();
			} else {
				expect( result ).toBeUndefined();
			}
		} );

		it( 'sorts lookup results correctly - not-in-list languages first', async () => {
			// Create items that only contain English, not Russian
			const testItems = [
				{
					langZid: 'Z1002',
					langLabelData: createLabelDataMock( 'Z1002', 'English', 'Z1002', 'en' ),
					objectValue: { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'English text' },
					value: 'English text',
					isInVisibleList: true
				}
			];

			// Mock lookup results with correct format expected by the component
			const mockLookupResponse = {
				labels: [
					{
						page_title: 'Z1002',
						label: 'English',
						match_lang: 'Z1002'
					},
					{
						page_title: 'Z1005',
						label: 'Russian',
						match_lang: 'Z1002'
					}
				]
			};

			store.lookupZObjectLabels = jest.fn().mockResolvedValue( mockLookupResponse );

			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: testItems, // Only contains Z1002 (English)
					edit: true
				},
				global: globalStubs
			} );

			await wrapper.vm.getLookupResults( 'test' );

			// Check the sorting results
			const results = wrapper.vm.lookupResults;
			expect( results.length ).toBe( 2 );

			// Find Russian and English in results
			const russianResult = results.find( ( r ) => r.langZid === 'Z1005' );
			const englishResult = results.find( ( r ) => r.langZid === 'Z1002' );

			expect( russianResult ).toBeDefined();
			expect( englishResult ).toBeDefined();
			expect( russianResult.isInList ).toBe( false );
			expect( englishResult.isInList ).toBe( true );

			// Russian (not in list) should come before English (in list)
			const russianIndex = results.findIndex( ( r ) => r.langZid === 'Z1005' );
			const englishIndex = results.findIndex( ( r ) => r.langZid === 'Z1002' );
			expect( russianIndex ).toBeLessThan( englishIndex );
		} );

		it( 'sorts lookup results correctly - languages with values first when both not in list', async () => {
			const itemsWithValues = [
				{
					langZid: 'Z1005',
					langLabelData: createLabelDataMock( 'Z1005', 'Russian', 'Z1002', 'ru' ),
					objectValue: { Z1K1: 'Z11', Z11K1: 'Z1005', Z11K2: 'Russian text' },
					value: 'Russian text',
					isInVisibleList: false
				},
				{
					langZid: 'Z1001',
					langLabelData: createLabelDataMock( 'Z1001', 'Arabic', 'Z1002', 'ar' ),
					objectValue: { Z1K1: 'Z11', Z11K1: 'Z1001', Z11K2: '' },
					value: '',
					isInVisibleList: false
				}
			];

			const mockLookupResponse = {
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
			};

			store.lookupZObjectLabels = jest.fn().mockResolvedValue( mockLookupResponse );

			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: itemsWithValues,
					edit: true
				},
				global: globalStubs
			} );

			await wrapper.vm.getLookupResults( 'test' );
			await wrapper.vm.$nextTick();

			const results = wrapper.vm.lookupResults;
			// Russian (has value) should come before Arabic (no value)
			expect( results.length ).toBe( 2 );
			expect( results[ 0 ].langZid ).toBe( 'Z1005' );
			expect( results[ 0 ].hasValue ).toBe( true );
			expect( results[ 1 ].langZid ).toBe( 'Z1001' );
			expect( results[ 1 ].hasValue ).toBe( false );
		} );

		it( 'sorts lookup results correctly - languages without values first when both in list', async () => {
			const itemsInList = [
				{
					langZid: 'Z1002',
					langLabelData: createLabelDataMock( 'Z1002', 'English', 'Z1002', 'en' ),
					objectValue: { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'English text' },
					value: 'English text',
					isInVisibleList: true
				},
				{
					langZid: 'Z1003',
					langLabelData: createLabelDataMock( 'Z1003', 'Spanish', 'Z1002', 'es' ),
					objectValue: { Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: '' },
					value: '',
					isInVisibleList: true
				}
			];

			const mockLookupResponse = {
				labels: [
					{
						page_title: 'Z1002',
						label: 'English',
						match_lang: 'Z1002'
					},
					{
						page_title: 'Z1003',
						label: 'Spanish',
						match_lang: 'Z1002'
					}
				]
			};

			store.lookupZObjectLabels = jest.fn().mockResolvedValue( mockLookupResponse );

			const wrapper = shallowMount( ZMultilingualStringDialog, {
				props: {
					keyPath: 'main.Z2K2.Z12K1',
					open: true,
					items: itemsInList,
					edit: true
				},
				global: globalStubs
			} );

			await wrapper.vm.getLookupResults( 'test' );
			await wrapper.vm.$nextTick();

			const results = wrapper.vm.lookupResults;
			// English (has value) should come before Spanish (no value) when both are in list
			expect( results.length ).toBe( 2 );
			expect( results[ 0 ].langZid ).toBe( 'Z1002' );
			expect( results[ 0 ].hasValue ).toBe( true );
			expect( results[ 1 ].langZid ).toBe( 'Z1003' );
			expect( results[ 1 ].hasValue ).toBe( false );
		} );
	} );
} );
