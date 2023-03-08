/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	ZMetadataDialog = require( '../../../../../resources/ext.wikilambda.edit/components/function/viewer/details/ZMetadataDialog.vue' );
describe( 'ZMetadataDialog', function () {
	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( ZMetadataDialog );
		expect( wrapper.find( '.ext-wikilambda-metadatadialog' ).exists() ).toBe( true );
	} );
} );
