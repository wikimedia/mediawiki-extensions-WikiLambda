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
		.findByRole( 'option', { name: itemText, hidden: true } ) );

const lookupSearchAndSelect = async ( parentWrapper, searchText, selectText ) => {
	const combobox = await within( parentWrapper ).findByRole( 'combobox' );
	await fireEvent.update( combobox, searchText );
	const option = await within( parentWrapper ).findByRole( 'option', { name: selectText, hidden: true } );
	return await fireEvent.click( option );
};

const textInputChange = ( parentWrapper, newText ) => {
	const textbox = within( parentWrapper ).getByRole( 'textbox' );
	return fireEvent.change( textbox, { target: { value: newText } } );
};

const chipInputAddChip = async ( parentWrapper, newChip ) => {
	const textbox = within( parentWrapper ).getByRole( 'textbox' );
	await fireEvent.update( textbox, newChip );
	return fireEvent.keyDown( textbox, { key: 'enter' } );
};

module.exports = {
	clickLookupResult: clickLookupResult,
	lookupSearchAndSelect: lookupSearchAndSelect,
	textInputChange: textInputChange,
	chipInputAddChip: chipInputAddChip
};
