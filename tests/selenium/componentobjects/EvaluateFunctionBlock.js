/**
 * @file contains the Evaluate Function Block related locators and actions.
 * EvaluateFunctionBlock is a general component which is used to call the function.
 * It has input fields to pass the arguments to the function and a result block
 * where the output of the function is displayed.
 */

'use strict';
const ElementActions = require( '../utils/ElementActions' );
const InputDropdown = require( './InputDropdown' );

class EvaluateFunctionBlock {
	get evaluateFunctionBlock() { return $( 'span.ext-wikilambda-function-evaluator' ); }
	get functionCallBlock() { return $( 'div.ext-wikilambda-function-evaluator-call' ); }
	get orchestrationResultBlock() { return $( 'div.ext-wikilambda-function-evaluator-result' ); }
	get resultStatus() { return this.orchestrationResultBlock.$( 'div.ext-wikilambda-function-evaluator-result-status' ); }
	get resultBlock() { return this.orchestrationResultBlock.$( './/label[text()=" result"]/parent::div/following-sibling::div' ); }

	// #region Function Call Block

	/**
	 * Toggle the Function Call Block
	 *
	 * @async
	 * @return {void}
	 */
	async toggleFunctionCallBlock() {
		const toggleButton = this.functionCallBlock.$( 'button.ext-wikilambda-expand-toggle' );
		await ElementActions.doClick( toggleButton );
	}

	/**
	 * Set the function for the Evaluation
	 *
	 * @async
	 * @param {string} ZObjectLabel
	 */
	async setFunction( ZObjectLabel ) {
		const parentBlock = this.functionCallBlock.$( './/label[text()=" function"]/parent::div/following-sibling::div' );
		const input = parentBlock.$( './/input[@placeholder="ZObject"]' );
		await InputDropdown.setInputDropdown( parentBlock, input, ZObjectLabel );
	}

	// #endregion

	// #region Result Block

	/**
	 * Wait for the result of the function call
	 *
	 * @async
	 * @return {void}
	 */
	async waitForResult() {
		await browser.waitUntil( async () => {
			return ( await this.resultStatus ).isExisting() === false;
		}, { timeoutMsg: 'The output of the function is not displayed' } );
	}

	// #endregion

	/**
	 * Click on the "Call Function" button
	 *
	 * @async
	 * @return {void}
	 */
	async callFunction() {
		const button = $( '//button[text()="Call Function"]' );
		await ElementActions.doClick( button );
	}
}

module.exports = new EvaluateFunctionBlock();
