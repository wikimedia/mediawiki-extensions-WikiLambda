/*!
 * WikiLambda Vue editor: Pinia store for language-related state, actions, mutations and getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const LabelData = require( '../classes/LabelData.js' );

module.exports = {
	state: {},

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
		 * Get user preferred language zid, from config variable zlangZid
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
		 * @return {Array}
		 */
		getFallbackLanguageZids: function () {
			return mw.language.getFallbackLanguageChain()
				.map( ( code ) => this.getLanguageZidOfCode( code ) )
				.filter( ( zid ) => !!zid );
		},

		/**
		 * Get `LabelData` object for a given language code.
		 *
		 * @return {Function} A function that accepts a language code and returns its `LabelData`.
		 */
		getLabelDataForLangCode: function () {
			/**
			 * Build a `LabelData` object for the specified language code.
			 *
			 * @param {string} langCode The language code to retrieve the `LabelData` for.
			 * @return {LabelData} The `LabelData` object containing label, language code, and directionality.
			 */
			const findLabelDataForLangCode = ( langCode ) => new LabelData(
				null,
				null,
				langCode,
				this.getLanguageIsoCodeOfZLang( langCode )
			);
			return findLabelDataForLangCode;
		}
	},

	actions: {}
};
