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
	 * Initializes the Vuex store
	 *
	 * @param {Object} context
	 */
	initialize: function ( context ) {
		var languageChain = mw.language.getFallbackLanguageChain();

		// Set user language
		context.commit( 'setZLangs', languageChain );

		// Pre-fetch a list of the most common Zids
		context.dispatch( 'fetchZKeys', [
			Constants.Z_OBJECT,
			Constants.Z_PERSISTENTOBJECT,
			Constants.Z_MULTILINGUALSTRING,
			Constants.Z_KEY,
			Constants.Z_TYPE,
			Constants.Z_STRING,
			Constants.Z_FUNCTION,
			Constants.Z_FUNCTION_CALL,
			Constants.Z_REFERENCE,
			Constants.Z_LIST,
			Constants.Z_BOOLEAN_TRUE,
			Constants.Z_BOOLEAN_FALSE,
			Constants.Z_IMPLEMENTATION
		] );
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
