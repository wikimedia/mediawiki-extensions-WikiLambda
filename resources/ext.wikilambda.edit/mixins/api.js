/**
 * WikiLambda Vue editor: callZFunction mixin
 * Mixin with util function to invoke a ZFunctionCall, canonicalize
 * the result, and return the ZObject and its respective pairs.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

/* eslint-disable camelcase */
var Constants = require( '../Constants.js' ),
	canonicalize = require( './schemata.js' ).methods.canonicalizeZObject;

module.exports = {
	methods: {
		performFunctionCall: function ( zobject, shouldNormalize ) {
			var api = new mw.Api();
			return api.post( {
				action: 'wikilambda_function_call',
				wikilambda_function_call_zobject: JSON.stringify(
					canonicalize( zobject )
				)
			} ).then( function ( data ) {
				// eslint-disable-next-line compat/compat
				return new Promise( function ( resolve ) {
					var normalResponse = JSON.parse(
							data.query.wikilambda_function_call.Orchestrated.data
						),
						response = !shouldNormalize ? canonicalize( normalResponse ) : normalResponse,
						result = response[ Constants.Z_PAIR_FIRST ],
						error = response[ Constants.Z_PAIR_SECOND ];

					resolve( {
						response: response,
						result: result,
						error: error
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
			} ).catch( function ( error ) {
				// Pass the error up the chain
				throw new Error( error );
			} );
		}
	}
};
