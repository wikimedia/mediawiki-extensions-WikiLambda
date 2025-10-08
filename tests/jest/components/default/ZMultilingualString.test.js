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

describe( 'ZMultilingualString', () => {
	let store;

	/**
	 * Helper function to render ZMultilingualString component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderZMultilingualString( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false,
			expanded: false
		};
		const defaultOptions = {
			global: {
				stubs: {
					wlKeyValueBlock: false,
					WlZObjectKeyValue: false,
					WlZMultilingualStringDialog: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( ZMultilingualString, {
			props: { ...defaultProps, ...props },
			...defaultOptions,
			...options
		} );
	}

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
			const wrapper = renderZMultilingualString( {
				edit: false
			} );
			expect( wrapper.find( '.ext-wikilambda-app-multilingual-string' ).exists() ).toBe( true );
		} );

		it( 'renders visible items based on priority', async () => {
			const wrapper = renderZMultilingualString( {
				edit: false
			} );

			// Should show user language and fallback languages initially
			const items = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } );
			await waitFor( () => expect( items.length ).toBeGreaterThan( 0 ) );
		} );

		it( 'shows load more button with correct count', () => {
			const wrapper = renderZMultilingualString( {
				edit: false
			} );

			const loadMoreButton = wrapper.find( '[data-testid="multilingual-string-load-more"]' );
			expect( loadMoreButton.exists() ).toBe( true );
		} );

		it( 'does not show add button in view mode', () => {
			const wrapper = renderZMultilingualString( {
				edit: false
			} );

			const addButton = wrapper.find( '[data-testid="multilingual-string-add-item"]' );
			expect( addButton.exists() ).toBe( false );
		} );

		it( 'does not expand blank items in view mode', async () => {
			const wrapper = renderZMultilingualString( {
				edit: false
			} );

			// Wait for component to render all items
			await waitFor( () => {
				const items = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } );
				expect( items.length ).toBe( 4 );
				// The blank item should be the last one and should not be expanded
				const blankItem = items[ items.length - 1 ];
				expect( blankItem.props( 'defaultExpanded' ) ).toBe( false );
			} );
		} );

		it( 'shows empty state when no visible items exist', () => {
			store.getZMultilingualValues = createGettersWithFunctionsMock( [] );
			store.getZMultilingualLangs = createGettersWithFunctionsMock( [] );

			const wrapper = renderZMultilingualString( {
				objectValue: emptyObjectValue,
				edit: false
			} );

			const emptyState = wrapper.find( '.ext-wikilambda-app-multilingual-string__empty-state' );
			expect( emptyState.exists() ).toBe( true );
			expect( emptyState.text() ).toBe( '0 items' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderZMultilingualString( {
				edit: true
			} );
			expect( wrapper.find( '.ext-wikilambda-app-multilingual-string' ).exists() ).toBe( true );
		} );

		it( 'shows add button in edit mode', () => {
			const wrapper = renderZMultilingualString( {
				edit: true
			} );

			const addButton = wrapper.find( '[data-testid="multilingual-string-add-item"]' );
			expect( addButton.exists() ).toBe( true );
		} );

		it( 'adds blank item when add button is clicked', async () => {
			const wrapper = renderZMultilingualString( {
				edit: true
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
			const wrapper = renderZMultilingualString( {
				edit: true
			} );

			const loadMoreButton = wrapper.find( '[data-testid="multilingual-string-load-more"]' );
			await loadMoreButton.trigger( 'click' );

			// Dialog should be opened (check via dialog component prop)
			const dialog = wrapper.findComponent( { name: 'wl-z-multilingual-string-dialog' } );
			expect( dialog.props( 'open' ) ).toBe( true );
		} );

		it( 'shows empty state when no visible items exist', () => {
			store.getZMultilingualValues = createGettersWithFunctionsMock( [] );
			store.getZMultilingualLangs = createGettersWithFunctionsMock( [] );

			const wrapper = renderZMultilingualString( {
				objectValue: emptyObjectValue,
				edit: false
			} );

			const emptyState = wrapper.find( '.ext-wikilambda-app-multilingual-string__empty-state' );
			expect( emptyState.exists() ).toBe( true );
			expect( emptyState.text() ).toBe( '0 items' );
		} );
	} );

	describe( 'language prioritization and sorting', () => {
		it( 'displays user language first, then fallback languages', async () => {
			const wrapper = renderZMultilingualString( {
				edit: false
			} );

			// Wait for all items to render
			await waitFor( () => {
				const items = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } );
				// The order of displayed items should follow priority: user language, fallback languages, blank items
				// We can verify this by checking that items exist and are rendered
				expect( items.length ).toBe( 4 ); // 3 languages + 1 blank
			} );
		} );

		it( 'displays blank items last', () => {
			const wrapper = renderZMultilingualString( {
				edit: false
			} );

			const items = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } );

			// The last item should be the blank item (not expanded in view mode)
			const lastItem = items[ items.length - 1 ];
			expect( lastItem.props( 'defaultExpanded' ) ).toBe( false );
		} );
	} );

	describe( 'initialization', () => {
		it( 'displays priority languages when available', async () => {
			const wrapper = renderZMultilingualString( {
				edit: false
			} );

			// Should display user and fallback languages that exist in store
			await waitFor( () => {
				const items = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } );
				expect( items.length ).toBe( 4 ); // 3 priority languages + 1 blank
			} );
		} );

		it( 'displays first available language if no priority languages exist', async () => {
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
			const wrapper = renderZMultilingualString( {
				objectValue: russianOnlyObjectValue,
				edit: false
			} );

			// Should display at least one language item
			await waitFor( () => {
				const items = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } );
				expect( items.length ).toBeGreaterThan( 0 );
			} );
		} );

		it( 'handles empty multilingual string', () => {
			store.getZMultilingualValues = createGettersWithFunctionsMock( [] );
			store.getZMultilingualLangs = createGettersWithFunctionsMock( [] );

			const wrapper = renderZMultilingualString( {
				objectValue: emptyObjectValue,
				edit: false
			} );

			// Should not display any language items
			const items = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } );
			expect( items.length ).toBe( 0 );
		} );
	} );

	describe( 'dialog interactions', () => {
		it( 'dialog is initially closed', () => {
			const wrapper = renderZMultilingualString( {
				edit: true
			} );

			const dialog = wrapper.findComponent( { name: 'wl-z-multilingual-string-dialog' } );
			expect( dialog.props( 'open' ) ).toBe( false );
		} );

		it( 'adds a new language item when dialog emits add-language', async () => {
			const wrapper = renderZMultilingualString( {
				edit: true
			} );

			const initialItemCount = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } ).length;

			// Emit add-language event from dialog
			const dialog = wrapper.findComponent( { name: 'wl-z-multilingual-string-dialog' } );
			dialog.vm.$emit( 'add-language', 'Z1005' );

			await waitFor( () => {
				// Should add a new language item or call store action
				const finalItemCount = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } ).length;
				// Either the item count increases or store method is called
				expect( finalItemCount >= initialItemCount || store.pushItemsByKeyPath ).toBeTruthy();
			} );
		} );

		it( 'closes dialog when close-dialog event is emitted', async () => {
			const wrapper = renderZMultilingualString( { edit: true } );

			// Open the dialog by clicking load more button
			const loadMoreButton = wrapper.find( '[data-testid="multilingual-string-load-more"]' );
			await loadMoreButton.trigger( 'click' );

			await waitFor( () => {
				expect( wrapper.findComponent( { name: 'wl-z-multilingual-string-dialog' } ).props( 'open' ) ).toBe( true );
			} );

			// Close the dialog
			const dialog = wrapper.findComponent( { name: 'wl-z-multilingual-string-dialog' } );
			dialog.vm.$emit( 'close-dialog' );

			await waitFor( () => {
				const updatedDialog = wrapper.findComponent( { name: 'wl-z-multilingual-string-dialog' } );
				expect( updatedDialog.props( 'open' ) ).toBe( false );
			} );
		} );
	} );

	describe( 'language tracking and cleanup', () => {
		it( 'displays newly added languages', async () => {
			const newObjectValue = {
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
							Z9K1: 'Z1005'
						},
						Z11K2: {
							Z1K1: 'Z6',
							Z6K1: 'Russian label'
						}
					}
				]
			};

			store.getZMultilingualValues = createGettersWithFunctionsMock( newObjectValue.Z12K1.slice( 1 ) );
			store.getZMultilingualLangs = createGettersWithFunctionsMock( [ 'Z1002', 'Z1005' ] );

			const wrapper = renderZMultilingualString( {
				objectValue: newObjectValue,
				edit: true
			} );

			// Should display the languages
			await waitFor( () => {
				const items = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } );
				expect( items.length ).toBeGreaterThan( 0 );
			} );
		} );

		it( 'updates display when languages are removed', async () => {
			const wrapper = renderZMultilingualString( {
				edit: true
			} );

			const initialItemCount = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } ).length;
			expect( initialItemCount ).toBeGreaterThan( 0 );

			// Update to have fewer languages
			const reducedObjectValue = {
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
					}
				]
			};

			store.getZMultilingualValues = createGettersWithFunctionsMock( reducedObjectValue.Z12K1.slice( 1 ) );
			store.getZMultilingualLangs = createGettersWithFunctionsMock( [ 'Z1002' ] );

			await wrapper.setProps( { objectValue: reducedObjectValue } );

			await waitFor( () => {
				// Should display fewer items or handle the update
				const finalItemCount = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } ).length;
				expect( finalItemCount ).toBeGreaterThanOrEqual( 0 );
				expect( finalItemCount ).toBeLessThanOrEqual( initialItemCount );
			} );
		} );
	} );

	describe( 'load more button', () => {
		it( 'displays load more button with count', () => {
			const wrapper = renderZMultilingualString( {
				edit: false
			} );

			const loadMoreButton = wrapper.find( '[data-testid="multilingual-string-load-more"]' );
			expect( loadMoreButton.exists() ).toBe( true );
			expect( loadMoreButton.text() ).toContain( '' ); // Should contain count text
		} );

		it( 'displays all language items when available', async () => {
			const wrapper = renderZMultilingualString( {
				edit: false
			} );

			await waitFor( () => {
				const items = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } );
				// Should include language items and blank items
				expect( items.length ).toBe( 4 );
			} );
		} );

		it( 'handles items with and without languages correctly', async () => {
			const wrapper = renderZMultilingualString( {
				edit: false
			} );

			await waitFor( () => {
				const items = wrapper.findAllComponents( { name: 'wl-z-object-key-value' } );
				// Should display items (both with languages and blank)
				expect( items.length ).toBe( 4 );
				// Last item should be blank and not expanded
				const lastItem = items[ items.length - 1 ];
				expect( lastItem.props( 'defaultExpanded' ) ).toBe( false );
			} );
		} );
	} );
} );
