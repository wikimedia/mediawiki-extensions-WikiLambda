/*!
 * WikiLambda unit test suite for the root Vuex actions
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const actions = require( '../../../resources/ext.wikilambda.edit/store/actions.js' );

describe( 'Vuex root actions', function () {
	it( 'prefetchZids function performs expected actions', function () {
		const context = {
			commit: jest.fn(),
			dispatch: jest.fn(),
			getters: {
				getUserLangZid: jest.fn().mockReturnValue( 'Z1002' )
			}
		};

		actions.prefetchZids( context );

		expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
		// No need to check specific prefetched keys, just that keys are being fetched
		expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', expect.anything() );
	} );
} );
