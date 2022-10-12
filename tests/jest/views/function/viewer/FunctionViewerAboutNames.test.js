/*!
 * WikiLambda unit test suite for the function-viewer-names component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	mocks = require( '../../../fixtures/mocks.js' ),
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionViewerNames = require( '../../../../../resources/ext.wikilambda.edit/views/function/about/FunctionViewerAboutNames.vue' ),
	FunctionViewerSidebar = require( '../../../../../resources/ext.wikilambda.edit/views/function/partials/FunctionViewerSidebar.vue' );

describe( 'FunctionViewerAliases', function () {
	beforeEach( function () {
		var getters = {
			getZObjectAsJsonById: createGettersWithFunctionsMock( mocks.mockLabels ),
			getZObjectChildrenById: createGettersWithFunctionsMock( [ 'Z123123' ] ),
			getNestedZObjectById: createGettersWithFunctionsMock( {} ),
			getUserZlangZID: jest.fn(),
			getZkeyLabels: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerNames );

		expect( wrapper.find( '.ext-wikilambda-function-viewer-names' ).exists() ).toBeTruthy();
	} );

	it( 'renders the sidebar component', function () {
		var wrapper = VueTestUtils.mount( FunctionViewerNames );

		expect( wrapper.findComponent( FunctionViewerSidebar ).exists() ).toBeTruthy();
	} );
} );
