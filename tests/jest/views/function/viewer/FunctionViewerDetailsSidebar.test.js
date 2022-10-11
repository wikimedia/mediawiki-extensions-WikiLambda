/*!
 * WikiLambda unit test suite for the function-viewer-details-sidebar component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionViewerSidebar = require( '../../../../../resources/ext.wikilambda.edit/views/function/details/FunctionViewerDetailsSidebar.vue' );

describe( 'FunctionViewerDetailsSidebar', function () {
	beforeEach( function () {
		var getters = {
			getCurrentZObjectId: jest.fn( function () {
				return 'Z1002';
			} ),
			getAllItemsFromListById: createGettersWithFunctionsMock(),
			getZObjectChildrenById: createGettersWithFunctionsMock(),
			getNestedZObjectById: createGettersWithFunctionsMock( { id: 10 } ),
			getZkeyLabels: jest.fn( function () {
				return {};
			} ),
			getCurrentZLanguage: jest.fn(),
			getZObjectTypeById: createGettersWithFunctionsMock( { id: 10 } )
		};

		global.store.hotUpdate( {
			getters: getters
		} );
		mw.Title = jest.fn( function ( title ) {
			return {
				getUrl: jest.fn( function () {
					return '/wiki/' + title;
				} )
			};
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerSidebar );

		expect( wrapper.find( '.ext-wikilambda-function-viewer-details-sidebar' ).exists() ).toBeTruthy();
	} );

	it( 'returns the correct url for creating an implementation', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerSidebar );
		var link = wrapper.find( '#ext-wikilambda-function-viewer-details-sidebar__link--implementation' );

		expect( link.attributes( 'href' ) ).toBeTruthy();
		expect( link.attributes().href ).toBe( '/wiki/Special:CreateZObject?zid=Z14&Z14K1=Z1002' );

	} );

	it( 'returns the correct url for creating a tester', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerSidebar );
		var link = wrapper.find( '#ext-wikilambda-function-viewer-details-sidebar__link--tester' );

		expect( link.attributes( 'href' ) ).toBeTruthy();
		expect( link.attributes().href ).toBe( '/wiki/Special:CreateZObject?zid=Z20&Z20K1=Z1002' );

	} );
} );
