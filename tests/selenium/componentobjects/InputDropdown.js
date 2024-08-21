/*!
 * InputDropdown Component Object for WikiLambda browser test suite
 *
 * Contains the Input Dropdown related locators and actions.
 *
 * InputDropdown is a general component which set the input in the input field and
 * select the item input from the dropdown.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const ElementActions = require( '../utils/ElementActions' );
const { Element: WebdriverIOElementType } = require( 'webdriverio' );

class InputDropdown {
	/**
	 * Set the input field to input text and select the input text from the dropdown
	 *
	 * @async
	 * @param {Promise<WebdriverIOElementType>} parentSelector - Nearest parent selector of
	 * input element
	 * @param {Promise<WebdriverIOElementType>} inputSelector - Selector of the input element
	 * @param {string} inputText - Text to enter into the input field
	 * @return {void}
	 */
	async setLookupOption( parentSelector, inputSelector, inputText ) {
		const resolvedParentSelector = await parentSelector;
		const resolvedInputSelector = await inputSelector;
		await inputSelector.waitForDisplayed();
		await ElementActions.setInput( resolvedInputSelector, inputText );
		const optionSelector = await resolvedParentSelector.$( `bdi=${ inputText }` );
		await ElementActions.doClick( optionSelector );
	}

	/**
	 * Select the input text from the dropdown
	 *
	 * @async
	 * @param {Promise<WebdriverIOElementType>} parentSelector - Nearest parent selector of
	 * readonly input element
	 * @param {Promise<WebdriverIOElementType>} inputSelector - Selector of the
	 * readonly input element
	 * @param {string} inputText - Text to be selected from dropdown
	 * @return {void}
	 */
	async setSelectOption( parentSelector, inputSelector, inputText ) {
		await ElementActions.doClick( inputSelector );
		const optionSelector = await parentSelector.$( `bdi=${ inputText }` );
		await ElementActions.doClick( optionSelector );
	}
}

module.exports = new InputDropdown();
