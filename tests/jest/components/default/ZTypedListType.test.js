/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZTypedListType = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZTypedListType.vue' ),
	ZObjectKeyValue = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZObjectKeyValue.vue' );

describe( 'ZTypedListType', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			getLabelData: createLabelDataMock(),
			getZObjectKeyByRowId: createGettersWithFunctionsMock( '0' ),

			// getters for ZObjectKeyValue
			isIdentityKey: createGettersWithFunctionsMock( false ),
			getDepthByRowId: createGettersWithFunctionsMock( 1 ),
			getParentRowId: createGettersWithFunctionsMock( 2 ),
			getZObjectValueByRowId: createGettersWithFunctionsMock(),
			getZObjectTypeByRowId: createGettersWithFunctionsMock( Constants.Z_STRING ),
			getUserLangZid: createGetterMock( 'Z1002' ),
			getUserLangCode: createGetterMock( 'en' )
		};

		actions = {
			setListItemsForRemoval: jest.fn(),
			setError: jest.fn(),
			clearErrors: jest.fn(),
			clearListItemsForRemoval: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
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

		expect( actions.clearErrors ).not.toHaveBeenCalled();
		expect( actions.setError ).toHaveBeenCalled();
		expect( actions.setListItemsForRemoval ).toHaveBeenCalledWith(
			expect.any( Object ),
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

		expect( actions.setError ).not.toHaveBeenCalled();
		expect( actions.setListItemsForRemoval ).not.toHaveBeenCalled();
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

		expect( actions.setError ).toHaveBeenCalled();
		expect( actions.setListItemsForRemoval ).toHaveBeenCalled();

		const mockZ1Payload = { keyPath: [], value: Constants.Z_OBJECT };
		wrapper.findComponent( ZObjectKeyValue ).vm.$emit( 'change-event', mockZ1Payload );

		expect( actions.clearErrors ).toHaveBeenCalled();
	} );

} );
