/**
 * @file contains the Function Explorer related locators and actions.
 * FunctionExplorerBlock is a general component which display the function details
 * for which implementation/tester page is open.
 */

'use strict';
const ElementActions = require( '../utils/ElementActions' );

class FunctionExplorerBlock {
	get functionExplorerBlock() { return $( 'span.ext-wikilambda-function-explorer' ); }
	get functionExplorerNameSelector() { return this.functionExplorerBlock.$( '//input[@placeholder="Select a Function"]' ); }

	/**
	 * Get the name of the function for which the page is open
	 *
	 * @async
	 * @return {string} - Name of the function
	 */
	async getFunctionExplorerName() {
		const name = await ElementActions.getValue( this.functionExplorerNameSelector );
		return name;
	}
}

module.exports = new FunctionExplorerBlock();
