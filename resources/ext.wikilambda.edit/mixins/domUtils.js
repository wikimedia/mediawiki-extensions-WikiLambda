/**
 * WikiLambda Vue editor: dom mixin
 * Mixin with functions to manipulate dom.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

function modifyElementInnerText( className, text ) {
	var element = $( className )[ 0 ];

	if ( element ) {
		element.innerText = text;
	}
}

function updateZObjectPageTitle( text ) {
	modifyElementInnerText( '#firstHeading .ext-wikilambda-editpage-header-title--function-name', text );
}

module.exports = exports = {
	methods: {
		updateZObjectPageTitle: updateZObjectPageTitle
	}
};
