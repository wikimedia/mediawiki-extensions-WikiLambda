/*!
 * WikiLambda unit test suite for the root Vuex state
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var state = require( '../../../resources/ext.wikilambda.edit/store/state.js' );

describe( 'Vuex root state', function () {
	it( 'regex returns true against ZObject keys', function () {
		expect( state.zRegex.test( 'Z1K1' ) ).toBe( true );
	} );

	it( 'regex returns true against ZObject types', function () {
		expect( state.zRegex.test( 'Z1' ) ).toBe( true );
	} );

	it( 'regex returns true against string with ZObject key', function () {
		expect( state.zRegex.test( 'This string is Z1K1' ) ).toBe( true );
	} );

	it( 'regex returns false if no ZObject type or key is present', function () {
		expect( state.zRegex.test( 'Nothing to Zee here' ) ).toBe( false );
	} );
} );
