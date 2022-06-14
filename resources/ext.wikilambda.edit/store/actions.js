/*!
 * WikiLambda Vue editor: Application store actions
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Constants = require( '../Constants.js' );

module.exports = exports = {
	/**
	 * Fetch information of the Keys used within the UI and initialize the i18n plugin
	 *
	 * @param {Object} context
	 * @param {Function} i18n - i18n function
	 */
	initialize: function ( context, i18n ) {
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
			Constants.Z_BOOLEAN,
			Constants.Z_BOOLEAN_TRUE,
			Constants.Z_BOOLEAN_FALSE,
			Constants.Z_IMPLEMENTATION,
			context.getters.getUserZlangZID,
			Constants.Z_TYPED_LIST
		] );

		context.commit( 'setI18n', i18n );
	},
	toggleExpertMode: function ( context ) {
		context.commit( 'setExpertMode', !context.getters.isExpertMode );
	}
};
