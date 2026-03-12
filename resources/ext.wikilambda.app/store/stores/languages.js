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

module.exports = {
	state: {
		/**
		 * Map of the available language zids in the store indexed by language code
		 */
		languages: {},
		/**
		 * Collection of in-flight language-code-to-ZID requests
		 * code: promise
		 */
		languageCodeRequests: {}
	},

	getters: {
		/**
		 * Returns the language zid given a language ISO code if the
		 * object has been fetched and is stored in the state.
		 * Falls back to server-side language mapping (wgWikiLambdaLangs) when available.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getLanguageZidOfCode: function ( state ) {
			/**
			 * @param {string} code
			 * @return {string|undefined}
			 */
			const findLanguageZid = ( code ) => {
				// Check state first
				if ( state.languages[ code ] ) {
					return state.languages[ code ];
				}
				// Fallback to server-side mapping when available
				const wgLangs = mw.config.get( 'wgWikiLambdaLangs' );
				if ( wgLangs && wgLangs[ code ] ) {
					return wgLangs[ code ];
				}
				return undefined;
			};
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
		 * Set or clear the in-flight request promise for a language code.
		 *
		 * @param {Object} payload
		 * @param {string} payload.code Language code
		 * @param {Promise|null} payload.request Promise for the in-flight request, or null to clear
		 */
		setLanguageCodeRequest: function ( payload ) {
			if ( payload.request ) {
				this.languageCodeRequests[ payload.code ] = payload.request;
			} else {
				delete this.languageCodeRequests[ payload.code ];
			}
		},

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
		 * then fetches those ZObjects. Codes already in state or in-flight are not requested again.
		 *
		 * * Codes are requested only once.
		 * * Every code is stored along with its request while it's being fetched.
		 * * Once it's fetched, the request is cleared.
		 * * The returning promise resolves when all requested codes have been handled.
		 *
		 * @param {Object} payload
		 * @param {string[]} payload.codes Array of language codes to ensure are fetched
		 * @return {Promise}
		 */
		ensureLanguageCodes: function ( payload ) {
			let requestCodes = [];
			const allPromises = [];
			const { codes = [] } = payload;

			codes.forEach( ( code ) => {
				// Ignore if:
				// * Language code is empty
				// * Language code is already known (ZID stored)
				// * Language code is already being fetched
				if ( code && !this.languages[ code ] && !this.languageCodeRequests[ code ] ) {
					requestCodes.push( code );
				}
				// Capture pending promise to await if:
				// * Language code is waiting to be fetched
				if ( code in this.languageCodeRequests ) {
					allPromises.push( this.languageCodeRequests[ code ] );
				}
			} );

			// Keep only unique values
			requestCodes = [ ...new Set( requestCodes ) ];

			if ( !requestCodes.length ) {
				return Promise.all( allPromises );
			}

			// Fetch the language codes
			const batchPromise = apiUtils.fetchLanguageZids( { codes: requestCodes } ).then( ( entries ) => {
				const newZids = [];
				entries.forEach( ( entry ) => {
					if ( !entry || !entry.code || !entry.zid ) {
						return;
					}
					this.setLanguageCode( { code: entry.code, zid: entry.zid } );
					newZids.push( entry.zid );
				} );
				// Once it's back, unset active request for these codes
				requestCodes.forEach( ( code ) => {
					this.setLanguageCodeRequest( { code, request: null } );
				} );
				// Fetch the ZObjects for the new ZIDs
				if ( newZids.length > 0 ) {
					this.fetchZids( { zids: newZids } );
				}
			} ).catch( ( error ) => {
				requestCodes.forEach( ( code ) => {
					this.setLanguageCodeRequest( { code, request: null } );
				} );
				throw error;
			} );

			// Set active request for each code in this batch
			requestCodes.forEach( ( code ) => {
				this.setLanguageCodeRequest( { code, request: batchPromise } );
			} );
			allPromises.push( batchPromise );

			return Promise.all( allPromises );
		}
	}
};
