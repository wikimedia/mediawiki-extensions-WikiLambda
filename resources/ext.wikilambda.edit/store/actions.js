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
	 * Call the wikilambda_fetch api to get the information of a given
	 * of ZIds, and stores the ZId information and the ZKey labels
	 * in the state.
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
			language: payload.zlangs[ 0 ]
		} ).then( function ( response ) {
			var zidInfo,
				keys,
				label,
				labels,
				langs,
				lang,
				i;

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
					// Dictionary of languages available in the multilingual string
					langs = {};
					labels = key[ Constants.Z_KEY_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ];
					labels.forEach( function ( value, index ) {
						langs[ value[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] ] = index;
					} );

					// Select the label to display
					// 1. Get the label in the first available language following the fallback chain
					label = null;

					for ( i = 0; i < payload.zlangs.length; i++ ) {
						lang = payload.zlangs[ i ];
						if ( lang in langs ) {
							label = labels[ langs[ lang ] ];
							break;
						}
					}

					// 2. If neither of them are present, get label in any language available
					if ( !label && ( labels.length > 0 ) ) {
						label = labels[ 0 ];
					}

					context.commit( 'addZKeyLabel', {
						key: key[ Constants.Z_KEY_ID ],
						label: label[ Constants.Z_MONOLINGUALSTRING_VALUE ]
					} );
				} );
			} );
		} );
	}
};
