/*!
 * WikiLambda Vue editor: Store module for language-related state, actions, mutations and getters
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

module.exports = {
	getters: {
		/**
		 * Get the user preferred language, which is also the first element of zLangs.
		 *
		 * @return {string}
		 */
		getZLang: function () {
			var langs = mw.language.getFallbackLanguageChain();

			if ( langs.length > 0 ) {
				return langs[ 0 ];
			} else {
				return 'en';
			}
		},

		/**
		 * Get user's ZLang ZID
		 *
		 * @return {string}
		 */
		getUserZlangZID: function () {
			return mw.config.get( 'wgWikiLambda' ).zlangZid;
		}
	}
};
