/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	FunctionViewerDetailsTable = require( '../../../../../resources/ext.wikilambda.edit/components/function/viewer/FunctionViewerDetailsTable.vue' );

describe( 'FunctionViewerDetailsTable', function () {
	it( 'renders without errors', function () {
		const wrapper = shallowMount( FunctionViewerDetailsTable, {
			props: {
				addLink: 'howfun.com',
				canConnect: false,
				canDisconnect: false,
				type: 'Z6'
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-details-table' ).exists() ).toBe( true );
	} );
} );
