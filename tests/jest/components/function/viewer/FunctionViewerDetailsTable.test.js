/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	FunctionViewerDetailsTable = require( '../../../../../resources/ext.wikilambda.edit/components/function/viewer/FunctionViewerDetailsTable.vue' );

describe( 'FunctionViewerDetailsTable', function () {
	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerDetailsTable );
		expect( wrapper.find( '.ext-wikilambda-function-details-table' ).exists() ).toBe( true );
	} );
} );
