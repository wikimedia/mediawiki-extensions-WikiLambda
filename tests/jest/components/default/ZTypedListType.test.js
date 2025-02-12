/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock;
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ZObjectKeyValue = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZObjectKeyValue.vue' );
const ZTypedListType = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZTypedListType.vue' );

describe( 'ZTypedListType', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getLabelData = createLabelDataMock();
		store.getZObjectKeyByRowId = createGettersWithFunctionsMock( '0' );
		store.isIdentityKey = createGettersWithFunctionsMock( false );
		store.getDepthByRowId = createGettersWithFunctionsMock( 1 );
		store.getParentRowId = createGettersWithFunctionsMock( 2 );
		store.getZObjectValueByRowId = createGettersWithFunctionsMock();
		store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );
		store.getUserLangZid = 'Z1002';
		store.getUserLangCode = 'en';
	} );

	it( 'renders without error in view mode', () => {
		const wrapper = shallowMount( ZTypedListType, {
			props: {
				edit: false
			}
		} );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'renders without error in edit mode', () => {
		const wrapper = shallowMount( ZTypedListType, {
			props: {
				edit: true
			}
		} );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'sets list items for removal when type changes and list items are present', () => {
		const wrapper = shallowMount( ZTypedListType, {
			props: {
				edit: true,
				listItemsRowIds: [ 1, 2 ]
			},
			global: {
				stubs: {
					WlZObjectKeyValue: false
				}
			}
		} );

		const mockPayload = { keyPath: [], value: Constants.Z_CHARACTER };

		wrapper.findComponent( ZObjectKeyValue ).vm.$emit( 'change-event', mockPayload );

		expect( store.clearErrors ).not.toHaveBeenCalled();
		expect( store.setError ).toHaveBeenCalled();
		expect( store.setInvalidListItems ).toHaveBeenCalledWith(
			{
				parentRowId: undefined,
				listItems: [ 1, 2 ]
			} );
	} );

	it( 'it does not set list items for removal if type changes to Z1', () => {
		const wrapper = shallowMount( ZTypedListType, {
			props: {
				edit: true,
				listItemsRowIds: [ 1, 2 ]
			},
			global: {
				stubs: {
					WlZObjectKeyValue: false
				}
			}
		} );

		const mockPayload = { keyPath: [], value: Constants.Z_OBJECT };
		wrapper.findComponent( ZObjectKeyValue ).vm.$emit( 'change-event', mockPayload );

		expect( store.setError ).not.toHaveBeenCalled();
		expect( store.setInvalidListItems ).not.toHaveBeenCalled();
	} );

	it( 'it clears errors when type changes back to Z1 after a change', () => {
		const wrapper = shallowMount( ZTypedListType, {
			props: {
				edit: true,
				listItemsRowIds: [ 1, 2 ]
			},
			global: {
				stubs: {
					WlZObjectKeyValue: false
				}
			}
		} );

		const mockPayload = { keyPath: [], value: Constants.Z_CHARACTER };
		wrapper.findComponent( ZObjectKeyValue ).vm.$emit( 'change-event', mockPayload );

		expect( store.setError ).toHaveBeenCalled();
		expect( store.setInvalidListItems ).toHaveBeenCalled();

		const mockZ1Payload = { keyPath: [], value: Constants.Z_OBJECT };
		wrapper.findComponent( ZObjectKeyValue ).vm.$emit( 'change-event', mockZ1Payload );

		expect( store.clearErrors ).toHaveBeenCalled();
	} );

} );
