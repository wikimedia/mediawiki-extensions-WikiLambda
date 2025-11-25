/*!
 * ObjectSelector Component Object for WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

import WebdriverIO from 'webdriverio';

class ObjectSelector {
	get menu() {
		return this.context.$( '.cdx-menu' );
	}

	/**
	 * Constructor. Prefer using fromInputField().
	 *
	 * @param {WebdriverIO.Element} context The root element of the object selector
	 * @param {WebdriverIO.Element} inputField The input field in which we can type for search.
	 *
	 * @return {ObjectSelector}
	 */
	constructor( context, inputField ) {
		this.context = context;
		this.inputField = inputField;
	}

	/**
	 * Instantiate a ObjectSelector given only an input field.
	 * The context element is deduced from this field.
	 *
	 * @param {WebdriverIO.Element} inputField The input field
	 * @return {Promise<WebdriverIO.Element>} The object selector
	 */
	static async fromInputField( inputField ) {
		const context = await inputField.custom$( 'ancestor', '.ext-wikilambda-app-object-selector' );
		return new this( context, inputField );
	}

	getMenuOptionByTextContent( textContent ) {
		return this.menu.$( `bdi=${ textContent }` );
	}

	/**
	 * @async
	 * Select an item in the object selector based on its name.
	 *
	 * @param {string} itemName The (exact) name of the item to select.
	 * @return {Promise<void>}
	 */
	async select( itemName ) {
		await this.inputField.click();
		await this.inputField.setValue( itemName );
		await this.menu.waitForDisplayed( { timeout: 10000 } );
		return await this.getMenuOptionByTextContent( itemName ).click();
	}
}

export default ObjectSelector;
