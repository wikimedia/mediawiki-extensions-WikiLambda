/*!
 * WikiLambda unit test suite for the function-viewers-details-table component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const FunctionViewerDetailsTable = require( '../../../../../resources/ext.wikilambda.app/components/function/viewer/FunctionViewerDetailsTable.vue' );

describe( 'FunctionViewerDetailsTable', () => {
	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionViewerDetailsTable, {
			props: {
				addLink: 'howfun.com',
				canConnect: false,
				canDisconnect: false,
				type: 'Z6'
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-viewer-details-table' ).exists() ).toBe( true );
	} );
} );
