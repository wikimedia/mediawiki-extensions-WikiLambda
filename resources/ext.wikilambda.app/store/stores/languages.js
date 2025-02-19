/*!
 * WikiLambda Vue editor: Pinia store for language-related state, actions, mutations and getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );
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
			// If wikilambda config is set up, return zlang
			if ( this.getWikilambdaConfig.zlang ) {
				return this.getWikilambdaConfig.zlang;
			}
			// Else return userLang only if it's a valid language code
			// or default to English if it's not:
			const userLang = mw.config.get( 'wgUserLanguage' );
			const contentLang = mw.config.get( 'wgPageContentLanguage' );
			return $.uls.data.languages[ userLang ] ? userLang : contentLang;
		},

		/**
		 * Get user preferred language zid, from config variable zlangZid
		 *
		 * @return {string}
		 */
		getUserLangZid: function () {
			// If wikilambda config is set up, return zlangZid
			if ( this.getWikilambdaConfig.zlangZid ) {
				return this.getWikilambdaConfig.zlangZid;
			}
			// Else return the Zid for getUserLangCode if it has been fetched
			// or default to English if it hasn't:
			const langZid = this.getLanguageZidOfCode( this.getUserLangCode );
			return langZid || Constants.Z_NATURAL_LANGUAGE_ENGLISH;
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
