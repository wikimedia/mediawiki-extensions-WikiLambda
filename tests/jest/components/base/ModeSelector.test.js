/*!
 * WikiLambda unit test suite for the ModeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { mount, shallowMount } = require( '@vue/test-utils' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ModeSelector = require( '../../../../resources/ext.wikilambda.app/components/base/ModeSelector.vue' );

const mockLabels = {
	Z18: 'Argument reference',
	Z7: 'Function call',
	Z11: 'Monolingual text',
	Z60: 'Natural language',
	Z1: 'Object',
	Z9: 'Reference',
	Z6: 'String'
};

describe( 'ModeSelector', () => {
	let store,
		keyPath,
		objectValue;

	beforeEach( () => {
		// reset props
		keyPath = undefined;
		objectValue = undefined;
		store = useMainStore();
		// Getters
		store.getLabelData = createLabelDataMock( mockLabels );
		store.getParentListCount = createGettersWithFunctionsMock( 1 );
		store.isCustomEnum = createGettersWithFunctionsMock( false );
	} );

	describe( 'basic rendering', () => {
		beforeEach( () => {
			keyPath = 'main.Z2K2';
			objectValue = { Z1K1: 'Z9', Z9K1: 'Z11' };
		} );

		it( 'renders without errors', () => {
			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue
				}
			} );
			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'renders the menu button', () => {
			const wrapper = mount( ModeSelector, {
				props: {
					keyPath,
					objectValue
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu' } );
			const toggleButton = wrapper.findComponent( { name: 'cdx-toggle-button' } );

			expect( menu.exists() ).toBe( true );
			expect( toggleButton.exists() ).toBe( true );
		} );

		it( 'opens the menu when button is clicked', async () => {
			const wrapper = mount( ModeSelector, {
				props: {
					keyPath,
					objectValue
				}
			} );
			const menu = wrapper.get( '.cdx-menu' );
			expect( menu.isVisible() ).toBe( false );

			const button = wrapper.findComponent( { name: 'cdx-toggle-button' } );
			button.trigger( 'click' );

			await wrapper.vm.$nextTick();

			await waitFor( () => expect( menu.isVisible() ).toBe( true ) );
		} );
	} );

	describe( 'it displays the correct options in the selector dropdown', () => {
		it( 'if a literal type is selected and its type is bound', () => {
			keyPath = 'main.Z2K2.Z11K2';
			objectValue = { Z1K1: 'Z6', Z6K1: 'some string' };

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_STRING
				}
			} );

			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems[ 0 ].items.length ).toBe( 3 );
			expect( menu.vm.menuItems[ 0 ].items[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 0 ].items[ 1 ].value ).toBe( 'Z6' );
			expect( menu.vm.menuItems[ 0 ].items[ 2 ].value ).toBe( 'Z9' );
		} );

		it( 'if a literal type is selected and its type is unbound', () => {
			keyPath = 'main.Z2K2';
			objectValue = { Z1K1: 'Z6', Z6K1: 'some string' };

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_OBJECT
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems[ 0 ].items.length ).toBe( 4 );
			expect( menu.vm.menuItems[ 0 ].items[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 0 ].items[ 1 ].value ).toBe( 'Z1' );
			expect( menu.vm.menuItems[ 0 ].items[ 2 ].value ).toBe( 'Z6' );
			expect( menu.vm.menuItems[ 0 ].items[ 3 ].value ).toBe( 'Z9' );
		} );

		it( 'if the type selector is inside a composition', () => {
			keyPath = 'main.Z2K2.Z14K2.Z10001K1.Z11K2';
			objectValue = { Z1K1: 'Z6', Z6K1: 'some string' };

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_STRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems[ 0 ].items.length ).toBe( 4 );
			expect( menu.vm.menuItems[ 0 ].items[ 0 ].value ).toBe( 'Z18' );
			expect( menu.vm.menuItems[ 0 ].items[ 1 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 0 ].items[ 2 ].value ).toBe( 'Z6' );
			expect( menu.vm.menuItems[ 0 ].items[ 3 ].value ).toBe( 'Z9' );
		} );

		it( 'if the type selected is a resolver type, shows the bound type if there is one', () => {
			keyPath = 'main.Z2K2.Z11K2';
			objectValue = { Z1K1: 'Z9', Z9K1: '' };

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_STRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems[ 0 ].items.length ).toBe( 3 );
			expect( menu.vm.menuItems[ 0 ].items[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 0 ].items[ 1 ].value ).toBe( 'Z6' );
			expect( menu.vm.menuItems[ 0 ].items[ 2 ].value ).toBe( 'Z9' );
		} );

		it( 'displays no literal option for wikidata entities, only function call', () => {
			keyPath = 'main.Z2K2.Z10001K1';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
				Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6825' },
				Z6825K1: {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6095' },
					Z6095K1: { Z1K1: 'Z6', Z6K1: 'L42' }
				}
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_WIKIDATA_LEXEME
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 1 );
			expect( menu.vm.menuItems[ 0 ].items.length ).toBe( 1 );
			expect( menu.vm.menuItems[ 0 ].items[ 0 ].value ).toBe( 'Z7' );
		} );

		it( 'displays no literal option for wikidata entities, only function call or argument reference if applicable', () => {
			keyPath = 'main.Z2K2.Z14K2.Z10001K1';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
				Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6825' },
				Z6825K1: {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6095' },
					Z6095K1: { Z1K1: 'Z6', Z6K1: 'L42' }
				}
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_WIKIDATA_LEXEME
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 1 );
			expect( menu.vm.menuItems[ 0 ].items.length ).toBe( 2 );
			expect( menu.vm.menuItems[ 0 ].items[ 0 ].value ).toBe( 'Z18' );
			expect( menu.vm.menuItems[ 0 ].items[ 1 ].value ).toBe( 'Z7' );
		} );

		it( 'displays function call and literal for wikidata references', () => {
			keyPath = 'main.Z2K2.Z10001K1';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6095' },
				Z6095K1: { Z1K1: 'Z6', Z6K1: 'L42' }
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems[ 0 ].items.length ).toBe( 2 );
			expect( menu.vm.menuItems[ 0 ].items[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 0 ].items[ 1 ].value ).toBe( Constants.Z_WIKIDATA_REFERENCE_LEXEME );
		} );

		it( 'displays literals and resolvers for wikidata entity with unbound parent type', () => {
			keyPath = 'main.Z2K2';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
				Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6825' },
				Z6825K1: {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6095' },
					Z6095K1: { Z1K1: 'Z6', Z6K1: 'L42' }
				}
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_OBJECT
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems[ 0 ].items.length ).toBe( 3 );
			expect( menu.vm.menuItems[ 0 ].items[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 0 ].items[ 1 ].value ).toBe( 'Z1' );
			expect( menu.vm.menuItems[ 0 ].items[ 2 ].value ).toBe( 'Z9' );
		} );

		it( 'displays literals and resolvers for wikidata reference with unbound parent type', () => {
			keyPath = 'main.Z2K2';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6095' },
				Z6095K1: { Z1K1: 'Z6', Z6K1: 'L42' }
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_OBJECT
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems[ 0 ].items.length ).toBe( 4 );
			expect( menu.vm.menuItems[ 0 ].items[ 0 ].value ).toBe( 'Z7' );
			expect( menu.vm.menuItems[ 0 ].items[ 1 ].value ).toBe( 'Z1' );
			expect( menu.vm.menuItems[ 0 ].items[ 2 ].value ).toBe( Constants.Z_WIKIDATA_REFERENCE_LEXEME );
			expect( menu.vm.menuItems[ 0 ].items[ 3 ].value ).toBe( 'Z9' );
			expect( menu.vm.menuItems[ 0 ].items[ 3 ].value ).toBe( 'Z9' );
		} );

		it( 'does not display types in EXCLUDE_FROM_LITERAL_MODE_SELECTION in the literal options', () => {
			keyPath = 'main.Z2K2';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z8' }
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true
				}
			} );

			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			const literalOptions = menu.vm.menuItems[ 0 ].items.filter( ( item ) => item.type === Constants.Z_FUNCTION );
			expect( literalOptions.length ).toBe( 0 );
		} );
	} );

	describe( 'set mode', () => {
		it( 'does not emit set-type when selected is same as current', async () => {
			keyPath = 'main.Z2K2.Z11K2';
			objectValue = { Z1K1: 'Z9', Z9K1: '' };

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_STRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			menu.vm.$emit( 'update:selected', Constants.Z_REFERENCE );
			await waitFor( () => expect( wrapper.emitted() ).not.toHaveProperty( 'set-type' ) );
		} );

		it( 'emit set-type when selected is not same as current', async () => {
			keyPath = 'main.Z2K2.Z11K2';
			objectValue = { Z1K1: 'Z9', Z9K1: '' };

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_STRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			menu.vm.$emit( 'update:selected', Constants.Z_STRING );
			await waitFor( () => expect( wrapper.emitted() ).toHaveProperty( 'set-type' ) );
		} );
	} );

	describe( 'for list items', () => {
		beforeEach( () => {
			store.getParentListCount = createGettersWithFunctionsMock( 3 );
		} );

		it( 'shows delete action as the last item', () => {
			keyPath = 'main.Z2K2.Z31K1.2';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
				Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
				Z11K2: { Z1K1: 'Z6', Z6K1: 'second' }
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 3 );
			expect( menu.vm.menuItems[ 2 ].items[ 0 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.DELETE_ITEM );
		} );

		it( 'emits delete-list-item event when selecting delete menu option', async () => {
			keyPath = 'main.Z2K2.Z31K1.2';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
				Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
				Z11K2: { Z1K1: 'Z6', Z6K1: 'second' }
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			menu.vm.$emit( 'update:selected', Constants.LIST_MENU_OPTIONS.DELETE_ITEM );
			await waitFor( () => expect( wrapper.emitted() ).toHaveProperty( 'delete-list-item' ) );
		} );

		it( 'shows enabled move-before and move-after menu options', () => {
			keyPath = 'main.Z2K2.Z31K1.2';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
				Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
				Z11K2: { Z1K1: 'Z6', Z6K1: 'second' }
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 3 );
			expect( menu.vm.menuItems[ 1 ].items[ 0 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_BEFORE );
			expect( menu.vm.menuItems[ 1 ].items[ 0 ].disabled ).toBe( false );
			expect( menu.vm.menuItems[ 1 ].items[ 1 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_AFTER );
			expect( menu.vm.menuItems[ 1 ].items[ 1 ].disabled ).toBe( false );
		} );

		it( 'shows disabled move-before for the first item', () => {
			keyPath = 'main.Z2K2.Z31K1.1';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
				Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
				Z11K2: { Z1K1: 'Z6', Z6K1: 'first' }
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 3 );
			expect( menu.vm.menuItems[ 1 ].items[ 0 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_BEFORE );
			expect( menu.vm.menuItems[ 1 ].items[ 0 ].disabled ).toBe( true );
			expect( menu.vm.menuItems[ 1 ].items[ 1 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_AFTER );
			expect( menu.vm.menuItems[ 1 ].items[ 1 ].disabled ).toBe( false );
		} );

		it( 'shows disabled move-after for the last item', () => {
			keyPath = 'main.Z2K2.Z31K1.3';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
				Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
				Z11K2: { Z1K1: 'Z6', Z6K1: 'third' }
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 3 );
			expect( menu.vm.menuItems[ 1 ].items[ 0 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_BEFORE );
			expect( menu.vm.menuItems[ 1 ].items[ 0 ].disabled ).toBe( false );
			expect( menu.vm.menuItems[ 1 ].items[ 1 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.MOVE_AFTER );
			expect( menu.vm.menuItems[ 1 ].items[ 1 ].disabled ).toBe( true );
		} );

		it( 'emits move-before event when selecting move-before menu option', async () => {
			keyPath = 'main.Z2K2.Z31K1.2';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
				Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
				Z11K2: { Z1K1: 'Z6', Z6K1: 'second' }
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );

			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			menu.vm.$emit( 'update:selected', Constants.LIST_MENU_OPTIONS.MOVE_BEFORE );
			await waitFor( () => expect( wrapper.emitted() ).toHaveProperty( 'move-before' ) );
		} );

		it( 'emits move-after event when selecting move-after menu option', async () => {
			keyPath = 'main.Z2K2.Z31K1.2';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
				Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
				Z11K2: { Z1K1: 'Z6', Z6K1: 'second' }
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );

			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			menu.vm.$emit( 'update:selected', Constants.LIST_MENU_OPTIONS.MOVE_AFTER );
			await waitFor( () => expect( wrapper.emitted() ).toHaveProperty( 'move-after' ) );
		} );

		it( 'does only show delete menu option if list is a multilingual string list', () => {
			keyPath = 'main.Z2K2.Z12K1.2';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
				Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
				Z11K2: { Z1K1: 'Z6', Z6K1: 'second' }
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 1 );
			expect( menu.vm.menuItems[ 0 ].items[ 0 ].value ).toEqual( Constants.LIST_MENU_OPTIONS.DELETE_ITEM );
		} );
	} );

	describe( 'add local argument to function call', () => {
		it( 'does not show add argument option if function call function is referenced', () => {
			keyPath = 'main.Z2K2.Z7K1';
			objectValue = { Z1K1: 'Z9', Z9K1: 'Z10000' };

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 1 );
		} );

		it( 'shows add argument option if function call function is a function call', () => {
			keyPath = 'main.Z2K2.Z7K1';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
				Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10000' }
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems[ 1 ].items.at( -1 ).value ).toBe( 'add-arg' );
		} );

		it( 'shows add argument option if function call function is an argument reference', () => {
			keyPath = 'main.Z2K2.Z7K1';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
				Z18K1: { Z1K1: 'Z6', Z6K1: 'Z10000K1' }
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems[ 1 ].items.at( -1 ).value ).toBe( 'add-arg' );
		} );

		it( 'emits add-arg event when selecting add-arg menu option', async () => {
			keyPath = 'main.Z2K2.Z7K1';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
				Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10000' }
			};

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			menu.vm.$emit( 'update:selected', Constants.LIST_MENU_OPTIONS.ADD_ARG );
			await waitFor( () => expect( wrapper.emitted() ).toHaveProperty( 'add-arg' ) );
		} );
	} );

	describe( 'delete local argument from function call', () => {
		it( 'does not show delete argument option if key is global', () => {
			keyPath = 'main.Z2K2.Z10000K1';
			objectValue = { Z1K1: 'Z6', Z6K1: 'some arg' };

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems.length ).toBe( 1 );
		} );

		it( 'shows delete argument option if key is local', () => {
			keyPath = 'main.Z2K2.K1';
			objectValue = { Z1K1: 'Z6', Z6K1: 'some arg' };

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			expect( menu.vm.menuItems[ 1 ].items.at( -1 ).value ).toBe( 'delete-arg' );
		} );

		it( 'emits add-arg event when selecting add-arg menu option', async () => {
			keyPath = 'main.Z2K2.K1';
			objectValue = { Z1K1: 'Z6', Z6K1: 'some arg' };

			const wrapper = shallowMount( ModeSelector, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					expectedType: Constants.Z_MONOLINGUALSTRING
				}
			} );
			const menu = wrapper.findComponent( { name: 'cdx-menu-button' } );
			menu.vm.$emit( 'update:selected', Constants.LIST_MENU_OPTIONS.DELETE_ARG );
			await waitFor( () => expect( wrapper.emitted() ).toHaveProperty( 'delete-arg' ) );
		} );
	} );
} );
