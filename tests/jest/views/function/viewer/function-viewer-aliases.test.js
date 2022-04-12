/*!
 * WikiLambda unit test suite for the function-viewer-aliases component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	mocks = require( '../../../fixtures/mocks.js' ),
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionViewerAliases = require( '../../../../../resources/ext.wikilambda.edit/views/function/about/function-viewer-aliases.vue' ),
	FunctionViewerSidebar = require( '../../../../../resources/ext.wikilambda.edit/views/function/partials/function-viewer-sidebar.vue' );

describe( 'FunctionViewerAliases', function () {
	beforeEach( function () {
		var getters = {
			getZObjectAsJsonById: createGettersWithFunctionsMock( mocks.mockLabels ),
			getZObjectChildrenById: createGettersWithFunctionsMock( [ 'Z123123' ] ),
			getNestedZObjectById: jest.fn(),
			getUserZlangZID: jest.fn( function () { return 'Z1002'; } ),
			getZkeyLabels: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerAliases );

		expect( wrapper.find( '.ext-wikilambda-function-viewer-aliases' ) ).toBeTruthy();
	} );

	it( 'renders the sidebar component', function () {
		var wrapper = VueTestUtils.mount( FunctionViewerAliases );

		expect( wrapper.findComponent( FunctionViewerSidebar ) ).toBeTruthy();
	} );

	it( 'filters function aliases to current language when showAllLangs is false', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerAliases, {
			computed: {
				langAliasString: function () {
					return mocks.mockSidebarItems;
				}
			}
		} );

		var selectedFunctionAliases = wrapper.vm.getSelectedAliases( 'Z1002' );
		expect( selectedFunctionAliases ).toEqual( [ mocks.mockSidebarItems[ 0 ] ] );
	} );
} );
