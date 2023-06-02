/*!
 * WikiLambda Vue editor: Application store getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
var Constants = require( '../Constants.js' );

module.exports = exports = {
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
