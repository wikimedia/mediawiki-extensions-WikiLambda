/*!
 * WikiLambda Vue editor: Store module for language-related state, actions, mutations and getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

module.exports = exports = {
	getters: {
		/**
		 * Get user preferred language code, from config variable zlang
		 *
		 * @return {string}
		 */
		getUserLangCode: function () {
			return mw.config.get( 'wgWikiLambda' ).zlang;
		},
		/**
		 * Get userpreferred language zid, from config variable zlangZid
		 *
		 * @return {string}
		 */
		getUserLangZid: function () {
			return mw.config.get( 'wgWikiLambda' ).zlangZid;
		},
		/**
		 * Return user requested lang, which might not be a valid WF language.
		 *
		 * @return {string}
		 */
		getUserRequestedLang: function () {
			return mw.language.getFallbackLanguageChain()[ 0 ];
		}
	}
};
