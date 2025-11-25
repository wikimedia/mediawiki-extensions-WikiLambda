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

import ElementActions from '../utils/ElementActions.js';

class EvaluateFunctionBlock {
	get evaluateFunctionBlock() {
		return $( '[data-testid="function-evaluator-widget"]' );
	}

	get functionCallBlock() {
		return this.evaluateFunctionBlock.$( '[data-testid="function-evaluator-inputs"]' );
	}

	get orchestrationResultBlock() {
		return $( '[data-testid="function-evaluator-result"]' );
	}

	// #region Function Call Block

	/**
	 * Click on the "Run function" button
	 *
	 * @async
	 * @return {void}
	 */
	async callFunction() {
		const evaluateFunctionBlock = await this.evaluateFunctionBlock;
		const button = await evaluateFunctionBlock.$( '[data-testid="evaluator-run-button"]' );
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
		await browser.waitUntil( async () => ( this.resultStatus ).isExisting() === false, { timeoutMsg: 'The output of the function is not displayed' } );
	}

	// #endregion
}

export default new EvaluateFunctionBlock();
