/*!
 * WikiLambda Vue editor: Application store actions
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var api = new mw.Api(),
	Constants = require( '../Constants.js' );

module.exports = {

	/**
	 * Call the wikilambda_fetch api to get the information of
	 * a given set of ZIds
	 *
	 * @param {Object} context
	 * @param {Object} payload
	 * @return {Promise}
	 */
	fetchZKeys: function ( context, payload ) {

		// Add fetching state to the requested zids
		context.commit( 'addFetchingZKeys', payload.zids );

		return api.get( {
			action: 'wikilambda_fetch',
			format: 'json',
			zids: payload.zids.join( '|' ),
			language: payload.zlang
		} ).then( function ( response ) {
			var zidInfo,
				keys,
				label;

			payload.zids.forEach( function ( zid ) {
				zidInfo = JSON.parse( response[ zid ].wikilambda_fetch );

				// State mutation:
				// Add zKey information to the collection
				context.commit( 'addZKeyInfo', {
					zid: zid,
					info: zidInfo
				} );

				// Done with fetching state
				context.commit( 'removeFetchingZKey', zid );

				// State mutation:
				// Add zKey label information in the user's selected language
				keys = zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];
				keys.forEach( function ( key ) {
					label = key[ Constants.Z_KEY_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ][ 0 ];
					context.commit( 'addZKeyLabel', {
						key: key[ Constants.Z_KEY_ID ],
						label: label[ Constants.Z_MONOLINGUALSTRING_VALUE ]
					} );
				} );
			} );
		} );
	}
};
