/*!
 * WikiLambda Vue editor: Application store actions
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var api = new mw.Api(),
	Constants = require( '../Constants.js' );

// Extract label from this multilingual string object using fallbacks
function labelFromMultilingualString( labels, zlangs ) {
	var i, label, lang, langs = {};

	// Create dictionary of languages available in the multilingual string
	labels.forEach( function ( value, index ) {
		langs[ value[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] ] = index;
	} );

	// Select the label to display
	// 1. Get the label in the first available language following the fallback chain
	label = null;

	for ( i = 0; i < zlangs.length; i++ ) {
		lang = zlangs[ i ];
		if ( lang in langs ) {
			label = labels[ langs[ lang ] ];
			break;
		}
	}

	// 2. If neither of them are present, get label in any language available
	if ( !label && ( labels.length > 0 ) ) {
		label = labels[ 0 ];
	}

	if ( !label ) {
		return null;
	}

	return label[ Constants.Z_MONOLINGUALSTRING_VALUE ];
}

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
				keys;

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
				// Add zObject label in user's selected language
				context.commit( 'addZKeyLabel', {
					key: zid,
					label: labelFromMultilingualString(
						zidInfo[ Constants.Z_PERSISTENTOBJECT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ],
						payload.zlangs
					)
				} );

				// State mutation:
				// Add zKey label information in the user's selected language
				// Only if zidInfo[Z2K2] is an object and zidInfo[Z2K2][Z1K1] === Z4
				if (
					( typeof zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ] === 'object' ) &&
					( zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] === Constants.Z_TYPE )
				) {
					keys = zidInfo[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];
					keys.forEach( function ( key ) {
						context.commit( 'addZKeyLabel', {
							key: key[ Constants.Z_KEY_ID ],
							label: labelFromMultilingualString(
								key[ Constants.Z_KEY_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ],
								payload.zlangs
							)
						} );
					} );
				}
			} );
		} );
	},

	/**
	 * Call the mediawiki api to get and store the list of languages in the state.
	 *
	 * @param {Object} context
	 * @return {Promise}
	 */
	fetchAllLangs: function ( context ) {
		var allLangs = {},
			langKey;

		if ( $.isEmptyObject( context.state.allLangs ) && !context.state.fetchingAllLangs ) {
			context.commit( 'setFetchingAllLangs', true );

			return api.get( {
				action: 'query',
				format: 'json',
				userlang: context.state.zLang,
				meta: 'languageinfo',
				liprop: 'code|name'
			} ).then( function ( response ) {
				for ( langKey in response.query.languageinfo ) {
					allLangs[ langKey ] = response.query.languageinfo[ langKey ].name;
				}

				context.commit( 'setAllLangs', allLangs );
			} );
		}
	}
};
