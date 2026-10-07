/*!
 * WikiLambda Vue editor: HTML validation utilities
 *
 * The rules find HTML that the parser removes or rejects, and report it in the
 * code editor.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

// Keep these in sync with WikifunctionsPFragmentRenderer's allowed elements/custom elements.
// Map of custom element name → the text that tells the user what the element does.
// Each element has its own messages, because each element does a different thing.
const customElementDefinitions = new Map( [
	[ 'ext-wikilambda-image', {
		// Shown in the gutter annotation, and with the autocomplete entry.
		description: mw.message( 'wikilambda-codeeditor-image-element-description' ).text(),
		// Shown beside the name in the autocomplete entry.
		detail: mw.message( 'wikilambda-codeeditor-image-element-detail' ).text()
	} ]
] );
const allowedCustomElements = new Set( customElementDefinitions.keys() );
const allowedTags = new Set( [
	'a', 'abbr', 'b', 'bdi', 'bdo', 'blockquote', 'br', 'caption', 'code', 'dd',
	'del', 'dfn', 'div', 'dl', 'dt', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'hr', 'i', 'ins', 'kbd', 'li', 'ol', 'p', 'q', 's', 'span', 'strike',
	'strong', 'sub', 'sup', 'table', 'td', 'th', 'tr', 'u', 'ul',
	...allowedCustomElements
] );

/**
 * A rule that finds invalid or noteworthy HTML. `getMessage` returns the text
 * to show, or null to ignore the match.
 *
 * @typedef {Object} HtmlValidationRule
 * @property {RegExp} pattern Global regular expression.
 * @property {string} severity Either 'error' or 'info'.
 * @property {Function} getMessage Takes a RegExp match, returns a string or null.
 * @ignore
 */

/**
 * A problem found in some HTML.
 *
 * @typedef {Object} HtmlProblem
 * @property {number} index Offset of the match in the given text.
 * @property {number} length Length of the match.
 * @property {string} severity Either 'error' or 'info'.
 * @property {string} message Text to show to the user.
 * @ignore
 */

/**
 * The rules, in the order they report their problems. The patterns are global,
 * so always reset `lastIndex` before you use one.
 *
 * @see https://www.mediawiki.org/wiki/Help:HTML_in_wikitext#Allowed_HTML_tags
 * @see https://doc.wikimedia.org/mediawiki-core/master/php/classMediaWiki_1_1Parser_1_1Sanitizer.html#af3c1cc4e16fb422fded4a29f56227f74
 *
 * @type {HtmlValidationRule[]}
 * @private
 */
const rules = [
	{
		// Disallowed tags.
		pattern: /<\/?([a-z0-9-]+)[^>]*?>/gi,
		severity: 'error',
		getMessage: function ( match ) {
			const tagName = match[ 1 ].toLowerCase();
			return allowedTags.has( tagName ) ?
				null :
				`Usage of <${ tagName }> tags is not allowed.`;
		}
	},
	{
		// Event handler attributes, such as onclick.
		pattern: /\s(on\w+)\s*=\s*(['"]).*?\2/gi,
		severity: 'error',
		getMessage: function ( match ) {
			return `Event handler attribute '${ match[ 1 ] }' is not allowed.`;
		}
	},
	{
		// JavaScript URLs in href or src attributes, ignoring quotes. The value
		// stops at the next quote, so that one match cannot cover the rest of
		// the document.
		pattern: /\s(?:href|src)\s*=\s*(['"])\s*javascript:[^'"]*\1/gi,
		severity: 'error',
		getMessage: function () {
			return 'JavaScript URLs are not allowed in attributes like href or src.';
		}
	},
	{
		// url(javascript:…) with or without quotes, in an inline style, a style
		// attribute, or a background-image. Whitespace is ignored.
		pattern: /url\s*\(\s*(?:(['"])\s*javascript\s*:[^'"]*\1|javascript\s*:[^)]+)\s*\)/gi,
		severity: 'error',
		getMessage: function () {
			return 'JavaScript URLs are not allowed in CSS url().';
		}
	},
	{
		// Custom elements. These are allowed; the message explains what they do.
		pattern: new RegExp( `<(${ [ ...allowedCustomElements ].join( '|' ) })\\b`, 'gi' ),
		severity: 'info',
		getMessage: function ( match ) {
			const definition = customElementDefinitions.get( match[ 1 ].toLowerCase() );
			return definition ? definition.description : null;
		}
	}
];

const htmlValidationUtils = {
	/**
	 * The HTML tags that the parser keeps, including the custom elements.
	 *
	 * @type {Set<string>}
	 */
	allowedTags: allowedTags,

	/**
	 * The names of the custom elements that WikiLambda adds.
	 *
	 * @type {Set<string>}
	 */
	allowedCustomElements: allowedCustomElements,

	/**
	 * The text for each custom element, keyed by the element name. Each value
	 * has a `description` and a `detail`.
	 *
	 * @type {Map<string,Object>}
	 */
	customElementDefinitions: customElementDefinitions,

	/**
	 * Run every rule over the given HTML.
	 *
	 * Give this one line to get columns, or the full document to get offsets.
	 *
	 * @param {string} text HTML to check
	 * @return {HtmlProblem[]} The problems found, which can be empty
	 */
	findHtmlProblems: function ( text ) {
		const problems = [];

		for ( const { pattern, severity, getMessage } of rules ) {
			// The rules are shared, so start each run from the beginning.
			pattern.lastIndex = 0;
			let match = pattern.exec( text );
			while ( match !== null ) {
				// Do not loop forever on a zero-length match.
				if ( match[ 0 ].length === 0 ) {
					pattern.lastIndex++;
				}
				const message = getMessage( match );
				if ( message ) {
					problems.push( {
						index: match.index,
						length: match[ 0 ].length,
						severity: severity,
						message: message
					} );
				}
				match = pattern.exec( text );
			}
		}

		return problems;
	}
};

module.exports = htmlValidationUtils;
