/*!
 * WikiLambda Vue editor: Application store getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
var Constants = require( '../Constants.js' );

module.exports = exports = {
	getZkeyLiteralType: function ( state, getters ) {

		/**
		 * Retrieve the literal type (actual type) of a specific ZKey. This is mainly used in the modeselector.
		 *
		 * @param {number} parentKey
		 * @return {string} LiteralType
		 */
		return function ( parentKey ) {
			if ( !parentKey ) {
				return;
			}

			const type = parentKey.match( /Z[1-9]\d*/ )[ 0 ];
			if ( getters.getZkeys[ type ] ) {
				const keysArray = getters.getZkeys[
					type
				][
					Constants.Z_PERSISTENTOBJECT_VALUE
				][
					Constants.Z_TYPE_KEYS
				];

				const keyFound = keysArray && keysArray.find(
					( key ) => key[ Constants.Z_KEY_ID ] === parentKey
				);
				return keyFound ? keyFound[ Constants.Z_KEY_TYPE ] : null;
			}

		};
	},
	paginateList: function () {
		return function ( items ) {
			var paginatedItems = {};
			var pageNum = 1;

			if ( items.length > 0 ) {
				for ( var i = 0; i < items.length; i += Constants.PAGINATION_SIZE ) {
					const endIndex = Math.min( items.length, i + Constants.PAGINATION_SIZE );
					const pageItems = items.slice( i, endIndex );

					paginatedItems[ pageNum ] = pageItems;
					pageNum++;
				}
				return paginatedItems;
			}
			return { 0: items };
		};
	},
	getViewMode: function () {
		var editingData = mw.config.get( 'wgWikiLambda' );
		return editingData.viewmode;
	},
	isExpertMode: function ( state ) {
		return state.expertMode;
	},
	isUserLoggedIn: function () {
		return !!mw.config.values.wgUserName;
	}
};
