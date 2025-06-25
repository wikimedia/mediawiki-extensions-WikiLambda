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
		await inputSelector.waitForDisplayed( { timeout: 15000 } );
		await browser.waitUntil( async () => await inputSelector.isEnabled(), { timeout: 15000 } );

		await ElementActions.doClick( inputSelector );

		let optionElement;
		await browser.waitUntil( async () => {
			try {
				optionElement = await parentSelector.$( `bdi=${ inputText }` );
				// fallback for a different additional elector to account for test flake here
				if ( !( await optionElement.isDisplayed() ) ) {
					optionElement = await parentSelector.$( `//*[contains(text(), "${ inputText }")]` );
				}

				return await optionElement.isDisplayed() && await optionElement.isEnabled();
			} catch ( error ) {
				return false;
			}
		}, { timeout: 10000 } );

		await ElementActions.scrollIntoView( optionElement );

		await browser.waitUntil( async () => {
			try {
				await ElementActions.doClick( optionElement );
				return true;
			} catch ( error ) {
				return false;
			}
		}, { timeout: 10000 } );
	}
}

module.exports = new InputDropdown();
