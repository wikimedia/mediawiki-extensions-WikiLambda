/*!
 * WikiLambda unit test suite interaction helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { fireEvent } = require( '@testing-library/vue' ),
	{ within } = require( '@testing-library/dom' );

const clickLookupResult = async ( parentWrapper, itemText ) =>
	await fireEvent.click( await within( parentWrapper )
		// For some reason menu items in CdxLookup show up as hidden, despite actually being visible in the UI.
		.findByRole( 'option', { name: itemText, hidden: true } ) );

module.exports = {
	clickLookupResult: clickLookupResult
};
