/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	mount = require( '@vue/test-utils' ).mount,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZTypedListType = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZTypedListType.vue' ),
	ZObjectKeyValue = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZObjectKeyValue.vue' );

describe( 'ZTypedListType', () => {
	var getters,
		actions;

	beforeEach( () => {
		getters = {
			getLabelData: createGettersWithFunctionsMock(
				{ zid: 'Z881K1', label: 'String', lang: 'Z1002' }
			),
			getExpectedTypeOfKey: createGettersWithFunctionsMock( 'Z1' ),
			getZObjectKeyByRowId: createGettersWithFunctionsMock( '0' ),
			getLabel: createGettersWithFunctionsMock( 'English' ),
			getErrors: createGettersWithFunctionsMock( {} ),

			// getters for mount, ZObjectKeyValue
			getZReferenceTerminalValue: jest.fn(),
			getDepthByRowId: () => () => { return 1; },
			getParentRowId: () => () => { return 2; },
			getZObjectValueByRowId: createGettersWithFunctionsMock(),
			getZObjectTypeByRowId: createGettersWithFunctionsMock( Constants.Z_STRING ),
			getZStringTerminalValue: createGettersWithFunctionsMock( 'string terminal value' ),
			getLanguageIsoCodeOfZLang: createGettersWithFunctionsMock( 'EN' ),
			getUserZlangZID: createGettersWithFunctionsMock( 'Z1002' ),
			getChildrenByParentRowId: createGettersWithFunctionsMock( [
				{ id: 2, key: '0', parent: 1, value: 'object' }
			] )
		};

		actions = {
			setListItemsForRemoval: jest.fn(),
			setError: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without error in view mode', () => {
		var wrapper = shallowMount( ZTypedListType, {
			props: {
				edit: false
			}
		} );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'renders without error in edit mode', () => {
		var wrapper = shallowMount( ZTypedListType, {
			props: {
				edit: true
			}
		} );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'sets list items for removal when type changes', () => {
		var wrapper = mount( ZTypedListType, {
			props: {
				edit: true
			}
		} );

		const mockPayload = { keyPath: [], value: Constants.Z_CHARACTER };
		wrapper.findComponent( ZObjectKeyValue ).vm.$emit( 'change-event', mockPayload );

		expect( actions.setError ).toHaveBeenCalled();
		expect( actions.setListItemsForRemoval ).toHaveBeenCalled();
	} );

	it( 'it does not set list items for removal if type changes to Z1', () => {
		var wrapper = mount( ZTypedListType, {
			props: {
				edit: true
			}
		} );

		const mockPayload = { keyPath: [], value: Constants.Z_OBJECT };
		wrapper.findComponent( ZObjectKeyValue ).vm.$emit( 'change-event', mockPayload );

		expect( actions.setError ).not.toHaveBeenCalled();
		expect( actions.setListItemsForRemoval ).not.toHaveBeenCalled();
	} );
} );
