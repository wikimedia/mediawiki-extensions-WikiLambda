/*!
 * WikiLambda Vue editor: Application store actions
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Constants = require( '../Constants.js' );

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
	}
};
