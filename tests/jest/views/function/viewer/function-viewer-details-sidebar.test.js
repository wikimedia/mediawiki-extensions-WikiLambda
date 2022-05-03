/*!
 * WikiLambda unit test suite for the function-viewer-details-sidebar component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	FunctionViewerSidebar = require( '../../../../../resources/ext.wikilambda.edit/views/function/partials/function-viewer-sidebar.vue' );

describe( 'FunctionViewerDetailsSidebar', function () {

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerSidebar );

		expect( wrapper.find( '.ext-wikilambda-function-viewer-details-sidebar' ) ).toBeTruthy();
	} );
} );
