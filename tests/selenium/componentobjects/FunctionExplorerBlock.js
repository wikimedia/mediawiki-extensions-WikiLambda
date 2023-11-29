/*!
 * FunctionExplorerBlock Component Object for WikiLambda browser test suite
 *
 * Contains the Function Explorer related locators and actions.
 *
 * FunctionExplorerBlock is a general component which display the function details
 * for which implementation/tester page is open.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const ElementActions = require( '../utils/ElementActions' );
const InputDropdown = require( './InputDropdown' );

class FunctionExplorerBlock {
	get functionExplorerBlock() {
		return $( 'div.ext-wikilambda-function-explorer' );
	}

	get functionNameInputSelector() {
		return this.functionExplorerBlock.$( './/section//input[@placeholder="Select function"]' );
	}

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

	async getFunctionExplorerZObjectLookup() {
		const functionExplorer = await this.functionExplorerBlock;
		await functionExplorer.waitForDisplayed( { timeout: 20000 } );
		const lookup = await functionExplorer.$( '[data-testid="z-object-selector-lookup"]' );
		const name = await ElementActions.getValue( lookup );
		return await name;

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
		await InputDropdown.setLookupOption( parentSelector, this.functionNameInputSelector,
			ZObjectLabel );
	}
}

module.exports = new FunctionExplorerBlock();
