/*!
 * WikiLambda unit test suite for the root Vuex actions
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var actions = require( '../../../resources/ext.wikilambda.edit/store/actions.js' );

describe( 'Vuex root actions', function () {
	it( 'initialize function performs expected actions', function () {
		var context = {
			commit: jest.fn(),
			dispatch: jest.fn()
		};

		actions.initialize( context );

		expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
		// No need to check specific prefetched keys, just that keys are being fetched
		expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZKeys', expect.anything() );
	} );
} );
