/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { CdxButton } = require( '@wikimedia/codex' ),
	shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	ZTypedList = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZTypedList.vue' ),
	ZTypedListItems = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZTypedListItems.vue' ),
	ZTypedListType = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZTypedListType.vue' );

describe( 'ZTypedList', () => {
	let getters;

	beforeEach( () => {
		getters = {
			getChildrenByParentRowId: createGettersWithFunctionsMock( [
				{ id: 28, key: '0', parent: 27, value: Constants.ROW_VALUE_OBJECT },
				{ id: 39, key: '1', parent: 27, value: Constants.ROW_VALUE_OBJECT },
				{ id: 41, key: '2', parent: 27, value: Constants.ROW_VALUE_OBJECT }
			] ),
			getTypedListItemType: createGettersWithFunctionsMock( 'Z6' ),
			getUserLangZid: createGetterMock( 'Z1002' )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'does not render add list button', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-ztyped-list__add-button' ).exists() ).toBe( false );
		} );

		it( 'does not render the list type when not expanded', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					edit: false,
					expanded: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-ztyped-list__type' ).exists() ).toBe( false );
		} );

		it( 'does render the list type when expanded', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					edit: false,
					expanded: true
				}
			} );
			expect( wrapper.getComponent( ZTypedListType ).exists() ).toBe( true );
		} );

		it( 'renders the list item component when there are one or more list items', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.findComponent( ZTypedListItems ).exists() ).toBe( true );
		} );

		it( 'shows type and items when expanded', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					edit: false,
					expanded: true
				}
			} );

			expect( wrapper.findComponent( ZTypedListType ).exists() ).toBe( true );
			expect( wrapper.findComponent( ZTypedListItems ).exists() ).toBe( true );
		} );

		it( 'does not show type when not expanded', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					edit: false,
					expanded: false
				}
			} );

			expect( wrapper.findComponent( ZTypedListType ).exists() ).toBe( false );
			expect( wrapper.findComponent( ZTypedListItems ).exists() ).toBe( true );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders the add list button', () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					edit: true
				},
				global: {
					stubs: {
						CdxButton: false,
						WlZTypedListType: false,
						WlZTypedListItems: false
					}
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-ztyped-list-add-button' ).exists() ).toBe( true );
		} );

		it( 'emits add-list-item when the add list item button is clicked', async () => {
			const wrapper = shallowMount( ZTypedList, {
				props: {
					edit: true
				},
				global: {
					stubs: {
						CdxButton: false,
						WlZTypedListType: false,
						WlZTypedListItems: false
					}
				}
			} );

			wrapper.get( '.ext-wikilambda-ztyped-list-add-button' ).getComponent( CdxButton ).vm.$emit( 'click' );
			expect( wrapper.emitted() ).toHaveProperty( 'add-list-item', [ [ { value: 'Z6' } ] ] );
		} );
	} );
} );
