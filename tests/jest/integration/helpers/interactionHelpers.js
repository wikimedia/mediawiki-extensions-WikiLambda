/*!
 * WikiLambda unit test suite interaction helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { fireEvent } = require( '@testing-library/vue' ),
	{ within } = require( '@testing-library/dom' );

const clickMenuOption = async ( parentWrapper, itemText ) => {
	const options = await within( parentWrapper ).findAllByRole( 'option', { hidden: true } );
	const option = options.find( ( e ) => e.textContent === itemText );
	if ( !option ) {
		throw new Error( 'Unable to find option "' + itemText + '"' );
	}
	return await fireEvent.click( option );
};

const lookupSearchAndSelect = async ( parentWrapper, searchText, selectText, selectType = '' ) => {
	const combobox = await within( parentWrapper ).findByRole( 'combobox' );
	await fireEvent.update( combobox, searchText );
	const matcher = ( content, element ) => element.textContent === `${ selectText }${ selectType }`;
	const matches = await within( parentWrapper ).findAllByText( matcher );
	if ( matches.length === 0 ) {
		throw new Error( 'Unable to find lookup result for "' + searchText + '"' );
	}
	const option = matches[ 0 ];
	return await fireEvent.click( option );
};

const textInputChange = ( parentWrapper, newText ) => {
	const textbox = within( parentWrapper ).getByRole( 'textbox' );
	// TODO (T370511): Using "fireEvent.change" may lead to unexpected results. Please use fireEvent.update() instead
	return fireEvent.change( textbox, { target: { value: newText } } );
};

const chipInputAddChip = async ( parentWrapper, newChip ) => {
	const textbox = within( parentWrapper ).getByRole( 'textbox' );
	await fireEvent.update( textbox, newChip );
	return await fireEvent.keyDown( textbox, { key: 'Enter' } );
};

module.exports = {
	clickMenuOption: clickMenuOption,
	lookupSearchAndSelect: lookupSearchAndSelect,
	textInputChange: textInputChange,
	chipInputAddChip: chipInputAddChip
};
