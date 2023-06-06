/**
 * @file contains the Function Explorer related locators and actions.
 * FunctionExplorerBlock is a general component which display the function details
 * for which implementation/tester page is open.
 */

'use strict';
const ElementActions = require( '../utils/ElementActions' );
const InputDropdown = require( './InputDropdown' );

class FunctionExplorerBlock {
	get functionExplorerBlock() { return $( 'span.ext-wikilambda-function-explorer' ); }
	get functionNameInputSelector() { return this.functionExplorerBlock.$( './/section//input[@placeholder="Select a Function"]' ); }

	/**
	 * Get the name of the function for which the page is open
	 *
	 * @async
	 * @return {string} - Name of the function
	 */
	async getFunctionExplorerInputName() {
		const name = await ElementActions.getValue( this.functionNameInputSelector );
		return name;
	}

	/**
	 * Set the name of the function for which the page is open
	 *
	 * @async
	 * @param {string} ZObjectLabel - ZObject of type Z8
	 * @return {void}
	 */
	async setFunctionExplorerName( ZObjectLabel ) {
		const parentSelector = this.functionNameInputSelector.$( './/ancestor::span[@data-testid]' );
		await InputDropdown.setInputDropdown( parentSelector, this.functionNameInputSelector,
			ZObjectLabel );
	}
}

module.exports = new FunctionExplorerBlock();
