/*!
 * WikiLambda unit test suite for the ZObjectKey component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	createGettersWithFunctionsMock = require( '../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	shallowMount = require( '@vue/test-utils' ).shallowMount,
	ZObjectKey = require( '../../../resources/ext.wikilambda.edit/components/ZObjectKey.vue' ),
	ZKeyModeSelector = require( '../../../resources/ext.wikilambda.edit/components/ZKeyModeSelector.vue' );

describe( 'ZObjectKey', function () {
	var getters,
		actions;

	beforeEach( function () {
		getters = {
			getZObjectTypeById: createGettersWithFunctionsMock( Constants.Z_TYPE ),
			getModeByType: createGettersWithFunctionsMock( Constants.Z_KEY_MODES.REFERENCE ),
			getZkeyLiteralType: createGettersWithFunctionsMock(),
			getListTypeById: createGettersWithFunctionsMock(),
			getTypeByMode: createGettersWithFunctionsMock(),
			getZkeyLabels: createGettersWithFunctionsMock(),
			getCurrentZObjectId: createGettersWithFunctionsMock(),
			getZObjectChildrenById: createGettersWithFunctionsMock()
		};
		actions = {
			fetchZKeys: jest.fn( function () {
				return true;
			} ),
			changeType: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );
	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZObjectKey );
		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'on mount, sets the literalType of the zKey, if available', async function () {
		const mockGetTypeByMode = jest.fn();
		getters.getZkeyLiteralType = createGettersWithFunctionsMock( Constants.Z_TYPE );
		getters.getTypeByMode = () => mockGetTypeByMode;

		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = shallowMount( ZObjectKey, {
			props: {
				zKey: Constants.Z_KEY_TYPE
			}
		} );

		wrapper.getComponent( ZKeyModeSelector ).vm.$emit( 'change', Constants.Z_KEY_MODES.REFERENCE );

		expect( mockGetTypeByMode.mock.calls )
			.toContainEqual( [ { selectedMode: Constants.Z_KEY_MODES.REFERENCE, literalType: Constants.Z_TYPE } ] );
		expect( actions.fetchZKeys ).toBeCalledTimes( 0 );
	} );

	it( 'on mount, if the literal type is unavailable it fetches the zKeys', function () {
		getters.getZkeyLiteralType = createGettersWithFunctionsMock( undefined );

		global.store.hotUpdate( {
			getters: getters
		} );

		shallowMount( ZObjectKey, {
			props: {
				zKey: Constants.Z_KEY_TYPE
			}
		} );

		expect( actions.fetchZKeys ).toHaveBeenCalledWith( expect.anything(), { zids: [ Constants.Z_KEY ] } );
	} );
} );
