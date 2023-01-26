/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZTypedListType = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZTypedListType.vue' ),
	WlSelect = require( '../../../../resources/ext.wikilambda.edit/components/base/Select.vue' );

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
			getZReferenceTerminalValue: createGettersWithFunctionsMock( 'Z1' ),
			isInsideComposition: createGettersWithFunctionsMock( false ),
			getLanguageIsoCodeOfZLang: createGettersWithFunctionsMock( 'en' ),
			getUserZlangZID: createGettersWithFunctionsMock( true )
		};

		actions = {
			setValueByRowIdAndPath: jest.fn()
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

	it( 'sets type when the child event emits a change', async () => {
		var wrapper = mount( ZTypedListType, {
			props: {
				edit: true
			}
		} );

		const selectComponent = wrapper.getComponent( WlSelect );
		expect( selectComponent.exists() ).toBeTruthy();

		await selectComponent.vm.$emit( 'update:selected', 'Reference' );
		expect( actions.setValueByRowIdAndPath ).toHaveBeenCalledWith(
			expect.anything(),
			{
				keyPath: [],
				rowId: 0,
				value: 'Reference'
			}
		);
	} );
} );
