/*!
 * WikiLambda unit test suite for the function-viewer-names component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	mocks = require( '../../../fixtures/mocks.js' ),
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionViewerNames = require( '../../../../../resources/ext.wikilambda.edit/components/function/viewer/about/FunctionViewerAboutNames.vue' ),
	FunctionViewerSidebar = require( '../../../../../resources/ext.wikilambda.edit/components/function/viewer/FunctionViewerSidebar.vue' );

describe( 'FunctionViewerAliases', function () {
	var getters;
	beforeEach( function () {
		getters = {
			getZObjectAsJsonById: createGettersWithFunctionsMock( mocks.mockFunction ),
			getZObjectChildrenById: createGettersWithFunctionsMock( [ 'Z123123' ] ),
			getNestedZObjectById: createGettersWithFunctionsMock( {
				id: 2,
				key: 'Z9K1',
				value: 'Z1002',
				parent: 1
			} ),
			getUserLangZid: jest.fn(),
			getLabel: createGettersWithFunctionsMock(),
			getStoredObject: createGettersWithFunctionsMock( { Z2K2: { Z60K1: 'en' } } ),
			getAllItemsFromListById: createGettersWithFunctionsMock( [
				{
					id: 4,
					key: '1',
					value: 'object',
					parent: 2
				},
				{
					id: 5,
					key: '2',
					value: 'object',
					parent: 2
				}
			] )
		};

		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	it( 'renders the component', function () {
		var wrapper = VueTestUtils.mount( FunctionViewerNames );

		expect( wrapper.find( '.ext-wikilambda-function-viewer-names' ).exists() ).toBeTruthy();

		expect( wrapper.findComponent( FunctionViewerSidebar ).exists() ).toBeTruthy();
	} );

	it( 'renders empty content if no function name', function () {
		getters.getAllItemsFromListById = createGettersWithFunctionsMock( [] );

		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = VueTestUtils.shallowMount( FunctionViewerNames );

		expect( wrapper.find( '.ext-wikilambda-function-viewer-names' ).exists() ).toBeFalsy();
	} );
} );
