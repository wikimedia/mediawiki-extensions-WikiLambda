/*!
 * WikiLambda Vue editor: Pinia store for language-related state, actions, mutations and getters
 *
 * Single source of truth for language preferences, code↔zid mapping, fallback,
 * and ensuring/fetching. Library stays the generic cache for ZObjects and other
 * auxiliary data.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );
const LabelData = require( '../classes/LabelData.js' );
const apiUtils = require( '../../utils/apiUtils.js' );
const storeUtils = require( '../../utils/storeUtils.js' );

module.exports = {
	state: {
		/**
		 * Map of the available language zids in the store indexed by language code
		 */
		languages: {},
		/**
		 * Map of in-flight language-code-to-ZID requests. Written only by
		 * `storeUtils.doDeduplicatedBatchFetch`.
		 * Key: language code
		 * Value: Promise for the batch that is fetching it
		 *
		 * @type {Map<string, Promise>}
		 */
		languageCodePromises: new Map()
	},

	getters: {
		/**
		 * Returns the language zid given a language ISO code if the
		 * object has been fetched and is stored in the state.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLanguageZidOfCode: function ( state ) {
			/**
			 * @param {string} code
			 * @return {string|undefined}
			 */
			const findLanguageZid = ( code ) => state.languages[ code ];
			return findLanguageZid;
		},

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

	actions: {
		/**
		 * @param {Object} payload
		 * @param {string} payload.code
		 * @param {string} payload.zid
		 */
		setLanguageCode: function ( payload ) {
			this.languages[ payload.code ] = payload.zid;
		},

		/**
		 * Orchestrates the call to the language-zids API to map language codes to ZLanguage ZIDs,
		 * then fetches those ZObjects. Deduplication is handled by
		 * `storeUtils.doDeduplicatedBatchFetch`: codes already in state, or already
		 * being fetched by another call, are not requested again.
		 *
		 * The returned promise resolves when every requested code has been handled,
		 * whether this call fetched it or waited for another one.
		 *
		 * @param {Object} payload
		 * @param {string[]} payload.codes Array of language codes to ensure are fetched
		 * @return {Promise}
		 */
		ensureLanguageCodes: function ( payload ) {
			const { codes = [] } = payload;
			// Collected inside `run`, so it holds only the ZIDs that this call
			// fetched. Codes handled by another in-flight batch are that
			// batch's job.
			const newZids = [];

			return storeUtils.doDeduplicatedBatchFetch( {
				inFlight: this.languageCodePromises,
				keys: codes,
				getCached: ( code ) => this.languages[ code ],
				setCached: ( code, zid ) => this.setLanguageCode( { code, zid } ),
				run: ( newCodes ) => apiUtils.fetchLanguageZids( { codes: newCodes } )
					.then( ( entries ) => {
						const zidsByCode = {};
						entries.forEach( ( entry ) => {
							if ( !entry || !entry.code || !entry.zid ) {
								return;
							}
							zidsByCode[ entry.code ] = entry.zid;
							newZids.push( entry.zid );
						} );
						return zidsByCode;
					} )
			} ).then( () => {
				// Fetch the ZObjects for the new ZIDs. This runs after the
				// codes are in state, so anything that resolves a ZID from a
				// code while fetching sees the new mappings.
				if ( newZids.length > 0 ) {
					this.fetchZids( { zids: newZids } );
				}
			} );
		}
	}
};
