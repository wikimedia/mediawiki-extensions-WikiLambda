/**
 * @file contains the locators and actions specific to the implementation form.
 * The form contains the following section
 * [1] About - Input the label, description, alias in different languages for the implementation
 * [2] Function Explorer - Display the details about the function to which implementation belongs
 * [3] Content Block contains the two mode for implementation
 * [a] Composition - Set the function call
 * [b] Code - Select the programming language and write the code in code editor
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
const AboutBlock = require( '../../componentobjects/AboutBlock' );
const ZObjectPublish = require( '../../componentobjects/ZObjectPublish' );
const FunctionExplorerBlock = require( '../../componentobjects/FunctionExplorerBlock' );
const ContentBlock = require( '../../componentobjects/ContentBlock' );
const ElementActions = require( '../../utils/ElementActions' );
const InputDropdown = require( '../../componentobjects/InputDropdown' );

class ImplementationForm extends Page {
	get aboutBlockDialogBox() { return AboutBlock.detailsInputDialogBox; }
	get contentBlock() { return ContentBlock.contentBlock; }

	// #region About Block

	/**
	 * Open the About Block Dialog Box
	 *
	 * @async
	 * @return {void}
	 */
	async openAboutBlockDialogBox() {
		await AboutBlock.openDetailsInputDialogBox();
	}

	/**
	 * Declare the object type: AboutBlockEntries
	 *
	 * @typedef {Object} AboutBlockEntries
	 * @property {string} language
	 * @property {string} label
	 * @property {string} description
	 * @property {string} alias
	 */

	/**
	 * Add the entries to the About Block Dialog Box
	 *
	 * @async
	 * @param {AboutBlockEntries} aboutBlockEntries
	 * @return {void}
	 */
	async addAboutBlockEntries( aboutBlockEntries ) {
		await AboutBlock.addAboutDetails( aboutBlockEntries );
	}

	/**
	 * Submit the About Block entries
	 *
	 * @async
	 * @return {void}
	 */
	async submitAboutBlockEntries() {
		await AboutBlock.submitAboutDetails();
	}

	// #endregion

	// #region Function Explorer block

	/**
	 * Get the name of the function for which implementation form is open
	 *
	 * @async
	 * @return {string} - Name of the function
	 */
	async getFunctionExplorerName() {
		const text = await FunctionExplorerBlock.getFunctionExplorerInputName();
		return text;
	}

	/**
	 * Set the name of the function for which the implementation form is open
	 *
	 * @async
	 * @param {string} ZObjectLabel - ZObject of type Z8
	 * @return {void}
	 */
	async setFunctionExplorerName( ZObjectLabel ) {
		await FunctionExplorerBlock.setFunctionExplorerName( ZObjectLabel );
	}

	// #endregion

	// #region Content Block

	/**
	 * Select the type of implementation
	 *
	 * @async
	 * @param {string} implementationType - "code" or "composition"
	 * @return {void}
	 */
	async selectImplementationType( implementationType ) {
		const implementationBlock = this.contentBlock.$( 'div.ext-wikilambda-implementation-type' );
		const implementationTypeLabel = implementationBlock.$( `.//label[text()="${implementationType}"]` );
		await ElementActions.doClick( implementationTypeLabel );
	}

	// #region Code block

	/**
	 * Select the programming language
	 *
	 * @async
	 * @param {string} language - "python", "javascript" or "lua"
	 * @return {void}
	 */
	async selectProgrammingLanguage( language ) {
		const languageInputSelector = this.contentBlock.$( './/span[text()="Select programming language" and @role="textbox"]' );
		const parentSelector = languageInputSelector.$( './/parent::div//parent::div' );
		await InputDropdown.setInputDropdownReadOnly( parentSelector, languageInputSelector,
			language );
	}

	/**
	 * Write the code in the code editor
	 *
	 * @async
	 * @param {Array<string>} codeInstructions - Instructions to write the code in code editor
	 * @return {void}
	 */
	async setCodeEditor( codeInstructions ) {
		const codeBlock = this.contentBlock.$( 'div.ext-wikilambda-codeEditor' );
		await codeBlock.$( './textarea' ).waitForExist();
		await codeBlock.$( './textarea' ).click();
		await browser.keys( codeInstructions );
	}

	// #endregion

	// #endregion

	/**
	 * Publish the implementation for the ZObject
	 *
	 * @async
	 * @return {void}
	 */
	async publishImplementation() {
		await ZObjectPublish.publish();
	}
}

module.exports = new ImplementationForm();
