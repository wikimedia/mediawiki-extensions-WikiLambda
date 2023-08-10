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
	 * Pre-fetch information of the Zids most commonly used within the UI
	 *
	 * @param {Object} context
	 */
	prefetchZids: function ( context ) {
		const zids = [
			Constants.Z_OBJECT,
			Constants.Z_PERSISTENTOBJECT,
			Constants.Z_MULTILINGUALSTRING,
			Constants.Z_MONOLINGUALSTRING,
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
			Constants.Z_TYPED_LIST,
			Constants.Z_ARGUMENT_REFERENCE
		];
		context.dispatch( 'fetchZids', { zids: zids } );
	}
};
