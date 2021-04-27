/*!
 * WikiLambda Vue editor: Application store getters
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
var Constants = require( '../Constants.js' );

module.exports = {

	zLang: function ( state ) {
		if ( state.zLangs.length > 0 ) {
			return state.zLangs[ 0 ];
		} else {
			return 'en';
		}
	},

	zProgrammingLangs: function ( state ) {
		return state.allZProgrammingLangs;
	},

	getZkeyLiteralType: function ( state ) {
		return function ( parentKey ) {
			var type = parentKey.match( /Z[1-9]\d*/ )[ 0 ],
				keysArray,
				currentKeyLiteralType = null;

			if ( state.zKeys[ type ] ) {

				keysArray = state.zKeys[ type ][ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];

				keysArray.forEach( function ( key ) {
					if ( key[ Constants.Z_KEY_ID ][ Constants.Z_STRING_VALUE ] === parentKey ) {
						currentKeyLiteralType = key[ Constants.Z_KEY_TYPE ][ Constants.Z_REFERENCE_ID ];
					}
				} );
				return currentKeyLiteralType || Constants.Z_KEY;
			}

		};
	}

};
