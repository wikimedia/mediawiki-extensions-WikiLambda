/**
 * WikiLambda Vue editor: dom mixin
 * Mixin with functions to manipulate dom.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

function modifyElementInnerText( className, text ) {
	var element = $( className )[ 0 ];

	if ( element ) {
		element.innerText = text;
	}
}

function updateEditFunctionPageTitle( text ) {
	modifyElementInnerText( '#firstHeading span', text );
}

module.exports = {
	methods: {
		updateEditFunctionPageTitle: updateEditFunctionPageTitle
	}
};
