/*!
 * WikiLambda Vue editor: Store module for language-related state, actions, mutations and getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

module.exports = exports = {
	state: {
		currentZLanguage: mw.config.get( 'wgWikiLambda' ).zlangZid
	},
	getters: {
		/**
		 * Get the user preferred language, which is also the first element of zLangs,
		 * or default to English if undefined.
		 *
		 * @return {string}
		 */
		getZLang: function () {
			return mw.language.getFallbackLanguageChain()[ 0 ] || 'en';
		},

		/**
		 * Get user's ZLang ZID
		 *
		 * @return {string}
		 */
		getUserZlangZID: function () {
			return mw.config.get( 'wgWikiLambda' ).zlangZid;
		},
		getCurrentZLanguage: function ( state ) {
			return state.currentZLanguage;
		}
	},
	mutations: {
		setCurrentZLanguage: function ( state, zLanguage ) {
			state.currentZLanguage = zLanguage;
		}
	},
	actions: {
		setCurrentZLanguage: function ( context, zLanguage ) {
			context.commit( 'setCurrentZLanguage', zLanguage );
		}
	}
};
