/*!
 * ElementActions utility object for WikiLambda browser test suite
 *
 * Contains general actions that are performed on the browser elements
 *
 * General Actions includes
 * [1] Click on the element
 * [2] Set the input
 * [3] Get the text from the selector
 * [4] Clear the input
 * [5] Get the value from the input selector
 * [6] Scroll the element into the viewport
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

import { Element as WebdriverIOElementType } from 'webdriverio';

class ElementActions {
	/**
	 * Wait for the element to be displayed, then click on the element
	 *
	 * @async
	 * @param {Promise<WebdriverIOElementType>} selector - selector of the element to be clicked
	 * @return {boolean}
	 */
	async doClick( selector ) {
		const element = await selector;

		let clicked = false;
		clicked = await element.waitForDisplayed();
		clicked = await element.waitForClickable();
		await element.click();
		return clicked;
	}

	/**
	 * Wait for the element to be displayed and enabled, then click on the element
	 *
	 * @async
	 * @param {Promise<WebdriverIOElementType>} selector - selector of the element to be clicked
	 * @return {void}
	 */
	async doEnabledClick( selector ) {
		await selector.waitForDisplayed();
		await selector.waitForEnabled();
		await selector.click();
	}

	/**
	 * Wait for the element to be displayed, then set the text into the input
	 *
	 * @async
	 * @param {Promise<WebdriverIOElementType>} selector - selector of the input field
	 * @param {string} inputText - Text to enter into the input field
	 * @return {void}
	 */
	async setInput( selector, inputText ) {
		await selector.waitForDisplayed();
		await selector.click();

		// remove this hack after https://phabricator.wikimedia.org/T398360 is fixed
		const value = await selector.getValue();
		if ( value === 'If' ) {
			for ( let i = 0; i < value.length; i++ ) {
				await browser.keys( 'Backspace' );
			}
		}
		// end of hack

		await selector.setValue( inputText );
	}

	/**
	 * Get the value from the input selector
	 *
	 * @async
	 * @param {Promise<WebdriverIOElementType>} inputSelector
	 * @return {string}
	 */
	async getValue( inputSelector ) {
		await inputSelector.waitForDisplayed();
		const value = await inputSelector.getValue();
		return value;
	}

	/**
	 * Get the text from the selector
	 *
	 * @async
	 * @param {Promise<WebdriverIOElementType>} selector
	 * @return {string}
	 */
	async getText( selector ) {
		await selector.waitForDisplayed();
		const text = await selector.getText();
		return text;
	}

	/**
	 * WebdriverIO docs mentions that setValue should first clear the input and then
	 * set the input. However this does not happen.
	 * The following is a temporarily solution to clear the input.
	 *
	 * @async
	 * @param {Promise<WebdriverIOElementType>} inputSelector - selector of the input field
	 */
	async clearInput( inputSelector ) {
		await inputSelector.waitForDisplayed();
		await inputSelector.click();
		await inputSelector.setValue( '' );
	}

	/**
	 * Scroll element into viewport
	 *
	 * @async
	 * @param {Promise<WebdriverIOElementType>} selector - Selector of the element
	 * @return {void}
	 */
	async scrollIntoView( selector ) {
		await selector.waitForExist();
		await selector.scrollIntoView( { block: 'center', inline: 'center' } );
	}
}

export default new ElementActions();
