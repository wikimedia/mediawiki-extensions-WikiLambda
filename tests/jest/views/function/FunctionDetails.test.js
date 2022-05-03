/*!
 * WikiLambda unit test suite for the FunctionDetails component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionDetails = require( '../../../../resources/ext.wikilambda.edit/views/function/FunctionDetails.vue' );
describe( 'FunctionDetails', function () {
	var getters;

	beforeEach( function () {
		getters = {
			getZObjectChildrenById: createGettersWithFunctionsMock()
		};

		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( FunctionDetails );
		expect( wrapper.find( '.ext-wikilambda-function-details' ) ).toBeTruthy();
	} );
} );
