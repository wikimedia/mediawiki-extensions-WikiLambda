/*!
 * WikiLambda unit test suite for the ZMultilingualString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const ZMultilingualString = require( '../../../../resources/ext.wikilambda.app/components/types/ZMultilingualString.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );

// Test data
const keyPath = 'main.Z2K2.Z12K1';
const objectValue = {
	Z1K1: {
		Z1K1: 'Z9',
		Z9K1: 'Z12'
	},
	Z12K1: [
		{
			Z1K1: 'Z9',
			Z9K1: 'Z11'
		},
		{
			Z1K1: {
				Z1K1: 'Z9',
				Z9K1: 'Z11'
			},
			Z11K1: {
				Z1K1: 'Z9',
				Z9K1: 'Z1002'
			},
			Z11K2: {
				Z1K1: 'Z6',
				Z6K1: 'English label'
			}
		},
		{
			Z1K1: {
				Z1K1: 'Z9',
				Z9K1: 'Z11'
			},
			Z11K1: {
				Z1K1: 'Z9',
				Z9K1: 'Z1003'
			},
			Z11K2: {
				Z1K1: 'Z6',
				Z6K1: 'Spanish label'
			}
		},
		{
			Z1K1: {
				Z1K1: 'Z9',
				Z9K1: 'Z11'
			},
			Z11K1: {
				Z1K1: 'Z9',
				Z9K1: 'Z1004'
			},
			Z11K2: {
				Z1K1: 'Z6',
				Z6K1: 'French label'
			}
		},
		{
			Z1K1: {
				Z1K1: 'Z9',
				Z9K1: 'Z11'
			},
			Z11K1: {
				Z1K1: 'Z9',
				Z9K1: ''
			},
			Z11K2: {
				Z1K1: 'Z6',
				Z6K1: ''
			}
		}
	]
};

const emptyObjectValue = {
	Z1K1: {
		Z1K1: 'Z9',
		Z9K1: 'Z12'
	},
	Z12K1: [
		{
			Z1K1: 'Z9',
			Z9K1: 'Z11'
		}
	]
};

const globalStubs = {
	stubs: {
		wlKeyValueBlock: false,
		WlZObjectKeyValue: false,
		WlZMultilingualStringDialog: false
	}
};

describe( 'ZMultilingualString', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangZid = 'Z1002';
		store.getFallbackLanguageZids = [ 'Z1003', 'Z1004' ];
		store.getLabelData = createLabelDataMock( {
			Z1001: 'Arabic',
			Z1002: 'English',
			Z1003: 'Spanish',
			Z1004: 'French',
			Z1005: 'Russian',
			Z1006: 'Chinese'
		} );
		store.getZMultilingualValues = createGettersWithFunctionsMock( objectValue.Z12K1.slice( 1 ) );
		store.getZMultilingualLangs = createGettersWithFunctionsMock( [ 'Z1002', 'Z1003', 'Z1004', '' ] );
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
		store.getZMonolingualLangValue = jest.fn().mockImplementation( ( obj ) => {
			if ( obj.Z11K1 && obj.Z11K1.Z9K1 ) {
				return obj.Z11K1.Z9K1;
			}
			return obj.Z11K1 || '';
		} );
		store.getZMonolingualTextValue = jest.fn().mockImplementation( ( obj ) => {
			if ( obj.Z11K2 && obj.Z11K2.Z6K1 !== undefined ) {
				return obj.Z11K2.Z6K1;
			}
			return obj.Z11K2 || '';
		} );
		store.createZMonolingualString = createGettersWithFunctionsMock( {
			Z1K1: {
				Z1K1: 'Z9',
				Z9K1: 'Z11'
			},
			Z11K1: {
				Z1K1: 'Z6',
				Z6K1: ''
			},
			Z11K2: {
				Z1K1: 'Z6',
				Z6K1: ''
			}
		} );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );
			expect( wrapper.find( '.ext-wikilambda-app-multilingual-string' ).exists() ).toBe( true );
		} );

		it( 'renders visible items based on priority', async () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );

			// Should show user language and fallback languages initially
			const items = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } );
			await waitFor( () => expect( items.length ).toBeGreaterThan( 0 ) );
		} );

		it( 'shows load more button with correct count', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );

			const loadMoreButton = wrapper.find( '[data-testid="multilingual-string-load-more"]' );
			expect( loadMoreButton.exists() ).toBe( true );
		} );

		it( 'does not show add button in view mode', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );

			const addButton = wrapper.find( '[data-testid="multilingual-string-add-item"]' );
			expect( addButton.exists() ).toBe( false );
		} );

		it( 'does not expand blank items in view mode', async () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );

			// Wait for component to be fully rendered and initialized
			await wrapper.vm.$nextTick();

			// Find the actual components - they should be wl-z-object-key-value components
			const items = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } );
			expect( items.length ).toBe( 4 );

			// The blank item should be the last one and should not be expanded
			const blankItem = items[ items.length - 1 ];
			expect( blankItem.props( 'defaultExpanded' ) ).toBe( false );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );
			expect( wrapper.find( '.ext-wikilambda-app-multilingual-string' ).exists() ).toBe( true );
		} );

		it( 'shows add button in edit mode', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );

			const addButton = wrapper.find( '[data-testid="multilingual-string-add-item"]' );
			expect( addButton.exists() ).toBe( true );
		} );

		it( 'adds blank item when add button is clicked', async () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );

			const addButton = wrapper.findComponent( { name: 'cdx-button' } );
			await addButton.trigger( 'click' );

			expect( store.pushItemsByKeyPath ).toHaveBeenCalledWith( {
				keyPath: [ 'main', 'Z2K2', 'Z12K1', Constants.Z_MULTILINGUALSTRING_VALUE ],
				values: [ {
					Z1K1: {
						Z1K1: 'Z9',
						Z9K1: 'Z11'
					},
					Z11K1: {
						Z1K1: 'Z6',
						Z6K1: ''
					},
					Z11K2: {
						Z1K1: 'Z6',
						Z6K1: ''
					}
				} ]
			} );

			const keyValueComponents = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } );

			// Find the blank item (should be the last one)
			const blankComponent = keyValueComponents.find( ( component ) => component.props( 'defaultExpanded' ) === true );
			expect( blankComponent ).toBeTruthy();
		} );

		it( 'opens dialog when load more button is clicked', async () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );

			const loadMoreButton = wrapper.find( '[data-testid="multilingual-string-load-more"]' );
			await loadMoreButton.trigger( 'click' );

			expect( wrapper.vm.showLoadMoreDialog ).toBe( true );
		} );
	} );

	describe( 'language prioritization and sorting', () => {
		it( 'computes priority correctly for different language types', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );

			// User language should have priority 1
			expect( wrapper.vm.getPriority( 'Z1002' ) ).toBe( 1 );

			// Fallback languages should have priority 2
			expect( wrapper.vm.getPriority( 'Z1003' ) ).toBe( 2 );
			expect( wrapper.vm.getPriority( 'Z1004' ) ).toBe( 2 );

			// Blank items should have priority 999
			expect( wrapper.vm.getPriority( '' ) ).toBe( 999 );
			expect( wrapper.vm.getPriority( null ) ).toBe( 999 );
			expect( wrapper.vm.getPriority( undefined ) ).toBe( 999 );

			// Other languages should have priority 500
			expect( wrapper.vm.getPriority( 'Z1005' ) ).toBe( 500 );
		} );

		it( 'sorts items by priority correctly', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );

			const items = [
				{ langZid: 'Z1005' }, // Other language (priority 500)
				{ langZid: '' }, // Blank (priority 999)
				{ langZid: 'Z1003' }, // Fallback (priority 2)
				{ langZid: 'Z1002' } // User language (priority 1)
			];

			const sorted = items.sort( ( a, b ) => wrapper.vm.sortItemsByPriority( a, b ) );

			expect( sorted[ 0 ].langZid ).toBe( 'Z1002' ); // User language first
			expect( sorted[ 1 ].langZid ).toBe( 'Z1003' ); // Fallback second
			expect( sorted[ 2 ].langZid ).toBe( 'Z1005' ); // Other language third
			expect( sorted[ 3 ].langZid ).toBe( '' ); // Blank last
		} );
	} );

	describe( 'initialization', () => {
		it( 'initializes with priority languages when available', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );

			// Should initialize with user and fallback languages that exist in store
			expect( wrapper.vm.visibleLangZids ).toContain( 'Z1002' );
			expect( wrapper.vm.visibleLangZids ).toContain( 'Z1003' );
			expect( wrapper.vm.visibleLangZids ).toContain( 'Z1004' );
		} );

		it( 'falls back to first available language if no priority languages exist', () => {
			const russianOnlyObjectValue = {
				Z1K1: {
					Z1K1: 'Z9',
					Z9K1: 'Z12'
				},
				Z12K1: [
					{
						Z1K1: 'Z9',
						Z9K1: 'Z11'
					},
					{
						Z1K1: {
							Z1K1: 'Z9',
							Z9K1: 'Z11'
						},
						Z11K1: {
							Z1K1: 'Z9',
							Z9K1: 'Z1005'
						},
						Z11K2: {
							Z1K1: 'Z6',
							Z6K1: 'Russian only'
						}
					}
				]
			};
			store.getZMultilingualValues = createGettersWithFunctionsMock( russianOnlyObjectValue.Z12K1.slice( 1 ) );
			store.getZMultilingualLangs = createGettersWithFunctionsMock( [ 'Z1005' ] );
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue: russianOnlyObjectValue,
					edit: false
				},
				global: globalStubs
			} );

			expect( wrapper.vm.visibleLangZids ).toContain( 'Z1005' );
		} );

		it( 'handles empty multilingual string', () => {
			store.getZMultilingualValues = createGettersWithFunctionsMock( [] );
			store.getZMultilingualLangs = createGettersWithFunctionsMock( [] );

			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue: emptyObjectValue,
					edit: false
				},
				global: globalStubs
			} );

			expect( wrapper.vm.visibleLangZids ).toEqual( [] );
			expect( wrapper.vm.visibleItems ).toEqual( [] );
		} );
	} );

	describe( 'dialog interactions', () => {
		it( 'provides correct dialog items', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );

			const dialogItems = wrapper.vm.dialogItems;
			expect( Array.isArray( dialogItems ) ).toBe( true );
			// Each dialog item should have the required properties
			dialogItems.forEach( ( item ) => {
				expect( item ).toHaveProperty( 'langZid' );
				expect( item ).toHaveProperty( 'isInVisibleList' );
				expect( item ).toHaveProperty( 'objectValue' );
				expect( item ).toHaveProperty( 'value' );
			} );
		} );

		it( 'adds language from dialog correctly', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );

			const initialVisibleCount = wrapper.vm.visibleLangZids.length;

			// Add a language that exists in store but is not visible
			wrapper.vm.addLanguageFromDialog( 'Z1005' );

			expect( wrapper.vm.visibleLangZids ).toContain( 'Z1005' );
			expect( wrapper.vm.visibleLangZids.length ).toBe( initialVisibleCount + 1 );
		} );

		it( 'creates new language item if not in store', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );

			// Add a language that doesn't exist in store
			wrapper.vm.addLanguageFromDialog( 'Z1005' );

			expect( store.pushItemsByKeyPath ).toHaveBeenCalled();
			expect( wrapper.vm.visibleLangZids ).toContain( 'Z1005' );
		} );

		it( 'prevents duplicate languages', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );

			const initialVisibleCount = wrapper.vm.visibleLangZids.length;

			// Try to add a language that's already visible
			wrapper.vm.addLanguageFromDialog( 'Z1002' );

			// Should not increase the count or create duplicates
			expect( wrapper.vm.visibleLangZids.length ).toBe( initialVisibleCount );
			expect( wrapper.vm.visibleLangZids.filter( ( id ) => id === 'Z1002' ).length ).toBe( 1 );
		} );

		it( 'closes dialog when close event is emitted', async () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expanded: false
				},
				global: globalStubs
			} );

			wrapper.vm.showLoadMoreDialog = true;
			await wrapper.vm.$nextTick();

			const dialog = wrapper.findComponent( { name: 'wl-z-multilingual-string-dialog' } );
			dialog.vm.$emit( 'close-dialog' );
			await wrapper.vm.$nextTick();

			expect( wrapper.vm.showLoadMoreDialog ).toBe( false );
		} );
	} );

	describe( 'language tracking and cleanup', () => {
		it( 'tracks newly added languages', async () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );

			const initialLangs = [ 'Z1002', 'Z1003', 'Z1004', '' ];
			const newLangs = [ 'Z1002', 'Z1003', 'Z1004', 'Z1005', '' ];

			// Simulate the langs watcher
			await wrapper.vm.$options.watch.langs.handler.call( wrapper.vm, newLangs, initialLangs );

			// New language should be added to visible list
			expect( wrapper.vm.visibleLangZids ).toContain( 'Z1005' );
		} );

		it( 'removes stale languages from visible list', async () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );

			// Add a language to visible list
			wrapper.vm.visibleLangZids = [ 'Z1002', 'Z1003', 'Z1004', 'Z1005' ];

			const initialLangs = [ 'Z1002', 'Z1003', 'Z1004', 'Z1005', '' ];
			const newLangs = [ 'Z1002', 'Z1003', '' ]; // Z1004 and Z1005 removed

			// Simulate the langs watcher
			await wrapper.vm.$options.watch.langs.handler.call( wrapper.vm, newLangs, initialLangs );

			// Stale languages should be removed
			expect( wrapper.vm.visibleLangZids ).not.toContain( 'Z1004' );
			expect( wrapper.vm.visibleLangZids ).not.toContain( 'Z1005' );
			expect( wrapper.vm.visibleLangZids ).toContain( 'Z1002' );
			expect( wrapper.vm.visibleLangZids ).toContain( 'Z1003' );
		} );
	} );

	describe( 'computed properties', () => {
		it( 'computes load more items count correctly', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );

			const count = wrapper.vm.loadMoreItemsCount;
			expect( typeof count ).toBe( 'number' );
			expect( count ).toBeGreaterThanOrEqual( 0 );
		} );

		it( 'computes visible items correctly', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );

			const visibleItems = wrapper.vm.visibleItems;
			expect( Array.isArray( visibleItems ) ).toBe( true );

			// Should include visible language items and blank items
			const languageItems = visibleItems.filter( ( item ) => item.langZid );
			const blankItems = visibleItems.filter( ( item ) => !item.langZid );

			expect( languageItems.length ).toBeGreaterThan( 0 );
			expect( blankItems.length ).toBeGreaterThan( 0 );
		} );

		it( 'identifies blank items correctly', () => {
			const wrapper = shallowMount( ZMultilingualString, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );

			// Test blank item (no language, no value)
			const blankItem = { langZid: '', value: '' };
			expect( wrapper.vm.isBlankItem( blankItem ) ).toBe( true );

			// Test item with language but no value
			const itemWithLang = { langZid: 'Z1002', value: '' };
			expect( wrapper.vm.isBlankItem( itemWithLang ) ).toBe( false );

			// Test item with value but no language
			const itemWithValue = { langZid: '', value: 'Some text' };
			expect( wrapper.vm.isBlankItem( itemWithValue ) ).toBe( true );

			// Test complete item
			const completeItem = { langZid: 'Z1002', value: 'English text' };
			expect( wrapper.vm.isBlankItem( completeItem ) ).toBe( false );
		} );
	} );
} );
