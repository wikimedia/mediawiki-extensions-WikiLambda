/*!
 * WikiLambda Vue editor: Application store getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = exports = {
	getViewMode: function () {
		var editingData = mw.config.get( 'wgWikiLambda' );
		return editingData.viewmode;
	}
};
