/**
 * WikiLambda Vue editor: miscellaneous utilities mixins
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = exports = {
	methods: {
		/**
		 * Get the text of the edit summary message for when changes are made to a Function
		 *
		 * @param {string} message The key of the message to fetch
		 * @param {string[]} ZIDs The ZIDs of the affected linked Implementations or Testers
		 * @return {string} The rendered message
		 */
		createConnectedItemsChangesSummaryMessage: function ( message, ZIDs ) {
			// Messages that can be used here:
			// * wikilambda-updated-implementations-approved-summary
			// * wikilambda-updated-implementations-deactivated-summary
			// * wikilambda-updated-testers-approved-summary
			// * wikilambda-updated-testers-deactivated-summary
			return mw.message( message ).params( mw.language.listToText( ZIDs ) ).text();
		}
	}
};
