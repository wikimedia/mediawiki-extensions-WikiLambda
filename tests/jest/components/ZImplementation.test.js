/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	createGettersWithFunctionsMock = require( '../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZImplementation = require( '../../../resources/ext.wikilambda.edit/components/main-types/ZImplementation.vue' ),
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'ZImplementation', function () {
	beforeEach( function () {
		var getters = {
			getZObjectById: function () {
				return jest.fn( function () {
					return [];
				} );
			},
			getZObjectChildrenById: createGettersWithFunctionsMock( [ 'Z123123' ] ),
			getZkeyLabels: createGettersWithFunctionsMock( [ 'Z14' ] ),
			getZkeys: jest.fn( function () {
				return {
					Z1002: {
						Z2K2: {
							Z8K3: [ 'Z1003' ]
						}
					}
				};
			} ),
			getNestedZObjectById: createGettersWithFunctionsMock( { id: 10 } ),
			getZarguments: function () {
				return { Z10024K1: { labels: [ { key: 'word: ', label: 'word', lang: 'Z1002' } ], zid: 'Z10024K1', type: 'String' } };
			},
			viewmode: jest.fn( function () {
				return false;
			} ),
			isNewZObject: jest.fn( function () {
				return true;
			} )
		};

		var actions = {
			fetchZKeys: jest.fn(),
			injectZObject: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( ZImplementation );
		expect( wrapper.find( '.ext-wikilambda-zimplementation' ).exists() ).toBe( true );
	} );
	it( 'shows the function selector when creating a new implementation from scratch', function () {
		var wrapper = VueTestUtils.shallowMount( ZImplementation, {
			data() {
				return {
					implMode: Constants.implementationModes.CODE
				};
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-zimplementation__function-selector' ).exists() ).toBe( true );
	} );
	it( 'does not show the function selector in view only mode', function () {
		var wrapper = VueTestUtils.shallowMount( ZImplementation, {
			props: {
				viewMode: true
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-zimplementation__function-selector' ).exists() ).toBe( false );
	} );
} );
