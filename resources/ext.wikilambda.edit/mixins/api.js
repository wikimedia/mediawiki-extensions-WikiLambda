/**
 * WikiLambda Vue editor: callZFunction mixin
 * Mixin with util function to invoke a ZFunctionCall, canonicalize
 * the result, and return the ZObject and its respective pairs.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Constants = require( '../Constants.js' ),
	hybridToCanonical = require( './schemata.js' ).methods.hybridToCanonical;

module.exports = exports = {
	methods: {
		performFunctionCall: function ( zobject, shouldNormalize ) {
			var api = new mw.Api();
			return api.post( {
				action: 'wikilambda_function_call',
				// eslint-disable-next-line camelcase
				wikilambda_function_call_zobject: JSON.stringify(
					hybridToCanonical( zobject )
				)
			} ).then( function ( data ) {
				return new Promise( function ( resolve ) {
					var normalResponse = JSON.parse(
							data.query.wikilambda_function_call.data
						),
						response = !shouldNormalize ? hybridToCanonical( normalResponse ) : normalResponse,
						result = response[ Constants.Z_RESPONSEENVELOPE_VALUE ],
						metadata = response[ Constants.Z_RESPONSEENVELOPE_METADATA ];

					resolve( {
						response: response,
						result: result,
						metadata: metadata
					} );
				} );
			} );
		},
		saveZObject: function ( zobject, zid, summary ) {
			var api = new mw.Api();

			return api.postWithEditToken( {
				action: 'wikilambda_edit',
				summary: summary || '',
				zid: zid,
				zobject: JSON.stringify( zobject )
			} ).then( function ( result ) {
				return result.wikilambda_edit;
			} ).catch( function ( error, result ) {
				// Pass the error up the chain
				throw ( result );
			} );
		}
	}
};
