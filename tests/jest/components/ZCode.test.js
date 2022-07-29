/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	createGettersWithFunctionsMock = require( '../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZCode = require( '../../../resources/ext.wikilambda.edit/components/types/ZCode.vue' );

describe( 'ZCode', function () {
	beforeEach( function () {
		var getters = {
			getZObjectChildrenById: createGettersWithFunctionsMock( [ 'Z123123' ] ),
			getAllProgrammingLangs: jest.fn( function () {
				return {};
			} )
		};

		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( ZCode );
		expect( wrapper.find( 'ext-wikilambda-zcode' ) ).toBeTruthy();
	} );
} );
