/*!
 * WikiLambda Vue editor: Application store actions
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
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
			action: 'query',
			list: 'wikilambdaload_zobjects',
			format: 'json',
			// eslint-disable-next-line camelcase
			wikilambdaload_zids: payload.zids.join( '|' ),
			// eslint-disable-next-line camelcase
			wikilambdaload_language: payload.zlangs[ 0 ]
		} ).then( function ( response ) {
			var keys,
				multilingualStr,
				zidInfo;

			payload.zids.forEach( function ( zid ) {
				if ( !( 'success' in response.query.wikilambdaload_zobjects[ zid ] ) ) {
					// TODO add error into error notification pool
					return;
				}

				zidInfo = response.query.wikilambdaload_zobjects[ zid ].data;

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
				multilingualStr = zidInfo[ Constants.Z_PERSISTENTOBJECT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ];
				context.commit( 'addZKeyLabel', {
					key: zid,
					label: multilingualStr[ 0 ][ Constants.Z_MONOLINGUALSTRING_VALUE ]
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
						multilingualStr = key[ Constants.Z_KEY_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ];
						context.commit( 'addZKeyLabel', {
							key: key[ Constants.Z_KEY_ID ][ Constants.Z_STRING_VALUE ],
							label: multilingualStr[ 0 ][ Constants.Z_MONOLINGUALSTRING_VALUE ]
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
	},

	/**
	 * Call the mediawiki api to get and store the list of Z61/Programming Languages in the state.
	 * TODO - implement API call to backend to get list of Z61.
	 *
	 * @param {Object} context
	 * @return {Object}
	 */
	fetchAllZProgrammingLanguages: function ( context ) {
		var zProgrammingLanguages = [
			{
				Z1K1: 'Z2',
				Z2K1: 'Z9999',
				Z2K2: {
					Z1K1: 'Z61',
					Z61K1: 'javascript',
					Z61K2: 'JavaScript'
				}
			},
			{
				Z1K1: 'Z2',
				Z2K1: 'Z99991',
				Z2K2: {
					Z1K1: 'Z61',
					Z61K1: 'python',
					Z61K2: 'Python'
				}
			},
			{
				Z1K1: 'Z2',
				Z2K1: 'Z99992',
				Z2K2: {
					Z1K1: 'Z61',
					Z61K1: 'lua',
					Z61K2: 'Lua'
				}
			}
		];

		context.commit( 'setAllZProgrammingLangs', zProgrammingLanguages );
		return zProgrammingLanguages;
	}
};
