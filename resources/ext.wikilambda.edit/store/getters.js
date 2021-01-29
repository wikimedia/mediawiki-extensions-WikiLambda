/*!
 * WikiLambda Vue editor: Application store getters
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = {

	zLang: function ( state ) {
		if ( state.zLangs.length > 0 ) {
			return state.zLangs[ 0 ];
		} else {
			return 'en';
		}
	}

};
