/*!
 * WikiLambda Vue editor: Application state
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = {
	/**
	 * Store whether the user is in 'expert' mode
	 */
	expertMode: mw.storage.get( 'aw-expert-mode' ) === 'true' || false,
	/**
	 * Store a reference to the i18n function
	 *
	 * @type {Function}
	 */
	i18n: function () {
		return '';
	}
};
