/*!
 * EvaluateFunctionBlock Component Object for WikiLambda browser test suite
 *
 * Contains the Evaluate Function Block related locators and actions.
 *
 * EvaluateFunctionBlock is a general component which is used to call the function.
 * It has input fields to pass the arguments to the function and a result block
 * where the output of the function is displayed.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const ElementActions = require( '../utils/ElementActions' );

class EvaluateFunctionBlock {
	get evaluateFunctionBlock() { return $( 'div.ext-wikilambda-function-evaluator' ); }
	get functionCallBlock() { return this.evaluateFunctionBlock.$( 'div.ext-wikilambda-function-evaluator-inputs' ); }
	get orchestrationResultBlock() { return $( 'div.ext-wikilambda-function-evaluator-result' ); }
	get resultStatus() { return this.orchestrationResultBlock.$( './/div[contains(text(),"Running")]' ); }

	// #region Function Call Block

	/**
	 * Click on the "Run function" button
	 *
	 * @async
	 * @return {void}
	 */
	async callFunction() {
		const evaluateFunctionBlock = await this.evaluateFunctionBlock;
		const button = await evaluateFunctionBlock.$( './/button[text()="Run function"]' );
		await ElementActions.doClick( button );
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
		const orchestrationResultBlock = await this.orchestrationResultBlock;
		await orchestrationResultBlock.waitForDisplayed( { message: 'Result Block not displayed' } );
		await browser.waitUntil( async () => {
			return ( this.resultStatus ).isExisting() === false;
		}, { timeoutMsg: 'The output of the function is not displayed' } );
	}

	// #endregion
}

module.exports = new EvaluateFunctionBlock();
