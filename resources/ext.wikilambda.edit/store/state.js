/*!
 * WikiLambda Vue editor: Application state
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = exports = {
	/**
	 * Store whether the user is in 'expert' mode
	 */
	expertMode: mw.storage.get( 'aw-expert-mode' ) === 'true' || false
};
