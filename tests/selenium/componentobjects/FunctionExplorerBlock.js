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

import ElementActions from '../utils/ElementActions.js';
import InputDropdown from './InputDropdown.js';

class FunctionExplorerBlock {
	get functionExplorerBlock() {
		return $( '[data-testid="function-explorer-widget"]' );
	}

	get functionNameInputSelector() {
		return this.functionExplorerBlock.$( '[data-testid="z-object-selector-lookup"]' );
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
		const lookup = await this.functionNameInputSelector;
		const name = await ElementActions.getValue( lookup );
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
		const parentSelector = '[data-testid="function-selector] [data-testid="z-object-selector-lookup"]';
		await InputDropdown.setLookupOption( parentSelector, this.functionNameInputSelector,
			ZObjectLabel );
	}
}

export default new FunctionExplorerBlock();
