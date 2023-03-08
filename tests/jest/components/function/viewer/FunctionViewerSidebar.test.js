/*!
 * WikiLambda unit test suite for the function-viewer-aliases component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	FunctionViewerSidebar = require( '../../../../../resources/ext.wikilambda.edit/components/function/viewer/FunctionViewerSidebar.vue' );

describe( 'FunctionViewerSidebar', function () {
	beforeEach( function () {
		global.store.hotUpdate( {} );
	} );

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerSidebar );

		expect( wrapper.find( '.ext-wikilambda-function-viewer-sidebar' ).exists() ).toBeTruthy();
	} );

	it( 'emits the changeShowLangs event when clicked', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerSidebar );

		expect( wrapper.find( '.ext-wikilambda-function-viewer-sidebar__button' ).exists() ).toBeTruthy();
		wrapper.find( '.ext-wikilambda-function-viewer-sidebar__button' ).trigger( 'click' );
		wrapper.vm.$nextTick( function () {
			// TODO: Remove need to manually call changeShowLangs, button click should trigger it
			wrapper.vm.changeShowLangs();
			expect( wrapper.emitted().changeShowLangs ).toBeTruthy();
		} );
	} );
} );
