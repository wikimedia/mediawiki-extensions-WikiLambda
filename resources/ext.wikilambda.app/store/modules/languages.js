/*!
 * WikiLambda Vue editor: Store module for language-related state, actions, mutations and getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const LabelData = require( '../classes/LabelData.js' );

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
		},
		/**
		 * Return the list of fallback languages in their Zid representations.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Array}
		 */
		getFallbackLanguageZids: function ( _state, getters ) {
			return mw.language.getFallbackLanguageChain()
				.map( ( code ) => getters.getLanguageZidOfCode( code ) )
				.filter( ( zid ) => !!zid );
		},
		/**
		 * Get `LabelData` object for a given language code.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function} A function that accepts a language code and returns its `LabelData`.
		 */
		getLabelDataForLangCode: function ( _state, getters ) {
			/**
			 * Build a `LabelData` object for the specified language code.
			 *
			 * @param {string} langCode The language code to retrieve the `LabelData` for.
			 * @return {LabelData} The `LabelData` object containing label, language code, and directionality.
			 */
			function buildLabelData( langCode ) {
				return new LabelData(
					null,
					null,
					langCode,
					getters.getLanguageIsoCodeOfZLang( langCode )
				);
			}
			return buildLabelData;
		}
	}
};
