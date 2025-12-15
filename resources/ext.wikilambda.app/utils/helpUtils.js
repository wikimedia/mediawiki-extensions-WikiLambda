/**
 * WikiLambda Vue editor: Help links configuration for different types.
 *
 * This file contains configuration for help links appearing at the top right
 * corner of the "Contents" box in create, edit and view pages for types
 * which use Default View (e.g. all but Function pages).
 *
 * To configure help links, set up a new entry in the helpLinks object where:
 * * The key is a string representation of the type (e.g. Z14, Z881(Z6), Z20...)
 * * The value must contain the entries 'shortText', 'text' and 'link' with existing
 *   i18n message keys. The content of shortText will probably the same one
 *   (e.g. 'wikilambda-editor-howto-short-text'), as that's generic, but it
 *   can be configured to be something different, which will be shown in mobile
 *   screens instead of 'text'
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const helpUtils = {
	helpLinks: {
		Z14: {
			shortText: 'wikilambda-editor-howto-short-text',
			text: 'wikilambda-editor-howto-implementation-text',
			link: 'wikilambda-editor-howto-implementation-link'
		}
	}
};

module.exports = helpUtils;
