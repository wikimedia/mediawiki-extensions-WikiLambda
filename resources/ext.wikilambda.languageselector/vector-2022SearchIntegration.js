/*!
 * WikiLambda Vector 2022 search integration code
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
( function ( mw ) {

	'use strict';

	function fetchResults( query, batchSize, showDescription = true, offset = null ) {
		const api = new mw.Api();

		const requestLang = ( mw.config.get( 'wgWikiLambda' ) && mw.config.get( 'wgWikiLambda' ).zlang ) || mw.config.get( 'wgUserLanguage' );

		const data = {
			action: 'query',
			list: 'wikilambdasearch_labels',
			// eslint-disable-next-line camelcase
			wikilambdasearch_search: query,
			// eslint-disable-next-line camelcase
			wikilambdasearch_language: requestLang,
			// eslint-disable-next-line camelcase
			wikilambdasearch_limit: batchSize,
			format: 'json',
			formatversion: '2',
			errorformat: 'plaintext'
		};
		if ( offset ) {
			data.continue = offset;
		}
		const responseJson = api.get( data );

		// Show a 'match string' explaining to the user how we chose this result, …
		const constructMatchString = function ( label, ZID, matchIsPrimary, matchLang, matchLabel ) {

			// But don't add an explainer if  …
			if (
				// … the match is the same as the shown label,
				matchLabel === label ||
				// … the match is the same as the shown ZID (direct search by ZID),
				matchLabel === ZID ||
				// … or is the primary label (so this isn't an alias)
					(
						matchIsPrimary &&
					// … and the label found is in the same language as searched
					matchLang === ( mw.config.get( 'wgWikiLambda' ) && mw.config.get( 'wgWikiLambda' ).zlangZid || 'Z1002' )
					)
			) {
				return undefined;
			}
			// Wrap the match in quotation marks to separate it from the actual label, for clarity
			return mw.msg( 'quotation-marks', [ matchLabel ] );
		};

		// Show a 'description' of what kind of object the user has found
		const constructDescriptionString = function ( pageType, typeLabel, returnType ) {

			// TODO (TKTKTK): Show the Wikidata short description as well // instead if available?

			// In the main case, this will be a type label and ZID, e.g. "Type (Z4)"
			let description = typeLabel + mw.msg( 'word-separator' ) + mw.msg( 'parentheses', pageType );

			// In special cases like Functions, this might also have the return type ZID
			if ( returnType ) {
				// TODO (TKTKTK): Show the input types as well as the output type where appropriate.
				description += mw.msg( 'word-separator' ) + '\u21D2' + mw.msg( 'word-separator' ) + returnType;
			}

			return description;
		};

		const searchResponsePromise = responseJson.then( ( res ) => ( {
			query: query,
			results: res.query.wikilambdasearch_labels.map(
				( {
					// eslint-disable-next-line camelcase
					page_title, page_type, return_type, match_is_primary, match_label, match_lang, label, type_label
				} ) => ( {
					value: label + mw.msg( 'word-separator' ) + mw.msg( 'parentheses', page_title ),
					match: constructMatchString( label, page_title, match_is_primary, match_lang, match_label ),
					description: ( !showDescription ?
						undefined :
						constructDescriptionString( page_type, type_label, return_type )
					),
					// Set the URL to the language-using view page for the ZObject, in case they're on w/index.php…
					// eslint-disable-next-line camelcase
					url: '/view/' + requestLang + '/' + page_title
				} )
			)
		} )
		);
		return {
			fetch: searchResponsePromise,
			abort: () => {
				api.abort();
			}
		};
	}

	module.exports = {

		/**
		 * Show ZObject search results in the Vector 2022 search interface.
		 *
		 * @singleton
		 * @ignore
		 */
		vectorSearchClient: {
			fetchByTitle: ( query, limit = 10, showDescription = true ) => fetchResults(
				query, limit, showDescription
			),
			loadMore: ( query, offset, limit = 10, showDescription = true ) => fetchResults(
				query, limit, showDescription, offset
			)
		}
	};
}( mw ) );
