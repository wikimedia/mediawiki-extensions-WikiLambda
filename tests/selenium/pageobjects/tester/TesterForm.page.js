/**
 * Tester Form page object for the WikiLambda browser test suite
 *
 * Contains the locators and actions specific to the Tester Form.
 *
 * The page contains the following sections
 * [1] About - Input the label, description, alias in different languages for the test
 * [2] Function Explorer - Display the details about the function to which test belongs
 * [3] Content Block - It is further divided into
 * [a] Call - Input the function, arguments for the Function call
 * [b] Result Validation - Input the function, arguments to validate the output of the Call
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
const AboutBlock = require( '../../componentobjects/AboutBlock' );
const InputDropdown = require( '../../componentobjects/InputDropdown' );
const ElementActions = require( '../../utils/ElementActions' );
const ZObjectPublish = require( '../../componentobjects/ZObjectPublish' );
const { Element: WebdriverIOElementType } = require( 'webdriverio' );
const ContentBlock = require( '../../componentobjects/ContentBlock' );
const FunctionExplorerBlock = require( '../../componentobjects/FunctionExplorerBlock' );

class TesterPage extends Page {
	get aboutBlockDialogBox() {
		return AboutBlock.detailsInputDialogBox;
	}

	get contentBlock() {
		return ContentBlock.contentBlock;
	}

	get callFunctionBlock() {
		return this.contentBlock.$( './/div[@role="ext-wikilambda-tester-call"]' );
	}

	get validationBlock() {
		return this.contentBlock.$( './/div[@role="ext-wikilambda-tester-validation"]' );
	}

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
	 * Get the name of the function for which test form is open
	 *
	 * @async
	 * @return {string} - Name of the function
	 */
	async getFunctionExplorerName() {
		const text = await FunctionExplorerBlock.getFunctionExplorerInputName();
		return text;
	}

	// #endregion

	// #region Call Function Block

	/**
	 * Expand the call function block by clicking on "Select Function" link
	 *
	 * @async
	 * @return {void}
	 */
	async expandCallFunctionBlock() {
		const selectFunctionLink = await this.callFunctionBlock.$( './/a[text()="Select Function"]' );
		await ElementActions.doClick( selectFunctionLink );
	}

	/**
	 * Get the section of the call function block depending on the label
	 *
	 * @param {string} label - label for the section
	 * @return {Promise<WebdriverIOElementType>}
	 */
	getCallFunctionBlockSection( label ) {
		return ContentBlock.getSectionOfContentBlock( label, this.callFunctionBlock );
	}

	/**
	 * Set the call function input to the ZObject for which a new test is being created
	 *
	 * @async
	 * @param {string} ZObjectLabel - Label of the ZObject
	 * @return {void}
	 */
	async setCallFunctionBlock( ZObjectLabel ) {
		/**
		 * Function section of call function block
		 */
		const parentSelector = await this.getCallFunctionBlockSection( 'function' );
		const callFunctionBlockInputSelector = await parentSelector.$( './/input[@placeholder="Select function"]' );
		await InputDropdown.setInputDropdown(
			parentSelector, callFunctionBlockInputSelector, ZObjectLabel );
	}

	/**
	 * Declare the object type: CallFunctionParameterInformation
	 *
	 * @typedef {Object} CallFunctionParameterInformation
	 * @property {string} condition
	 * @property {string} thenBlockInputType
	 * @property {string} thenBlockInput
	 * @property {string} elseBlockInputType
	 * @property {string} elseBlockInput
	 */

	/**
	 * Fills the entries in the If (Z802) parameters block
	 *
	 * @async
	 * @param {CallFunctionParameterInformation} callFunctionParameterInformation
	 * @return {void}
	 */
	async setCallFunctionParameters( callFunctionParameterInformation ) {
		const { condition, thenBlockInputType, thenBlockInput,
			elseBlockInputType, elseBlockInput } = callFunctionParameterInformation;
		/**
		 * Fills the entries in the condition block
		 */
		const conditionBlock = await this.getCallFunctionBlockSection( 'condition' );
		const conditionInputRadio = await conditionBlock.$( `.//label[span/text()="${ condition }"]` );
		await ElementActions.doClick( conditionInputRadio );

		/**
		 * Fills the entries in the then block
		 */
		const thenBlock = await this.getCallFunctionBlockSection( 'then' );
		const thenBlockInputTypeSelector = await thenBlock.$( './/input[@placeholder="Select a Type"]' );
		await InputDropdown.setInputDropdown(
			thenBlock, thenBlockInputTypeSelector, thenBlockInputType );
		const thenBlockInputSelector = await thenBlock.$( 'input' );
		await ElementActions.setInput( thenBlockInputSelector, thenBlockInput );

		/**
		 * Fills the entries in the else block
		 */
		const elseBlock = await this.getCallFunctionBlockSection( 'else' );
		const elseBlockInputTypeSelector = await elseBlock.$( './/input[@placeholder="Select a Type"]' );
		await InputDropdown.setInputDropdown(
			elseBlock, elseBlockInputTypeSelector, elseBlockInputType );
		const elseBlockInputSelector = await elseBlock.$( 'input' );
		await ElementActions.setInput( elseBlockInputSelector, elseBlockInput );
	}

	// #endregion

	// #region Result Validation Block

	/**
	 * Expand the validation block by clicking on "Select Function" link
	 *
	 * @async
	 * @return {void}
	 */
	async expandValidationBlock() {
		const selectFunctionLink = await this.validationBlock.$( './/a[text()="Select Function"]' );
		await ElementActions.doClick( selectFunctionLink );
	}

	/**
	 * Get the section of the validation block depending on the label
	 *
	 * @param {string} label - label for the section
	 * @return {Promise<WebdriverIOElementType>}
	 */
	getValidationBlockSection( label ) {
		return ContentBlock.getSectionOfContentBlock( label, this.validationBlock );
	}

	/**
	 * Set the validation function input to the ZObject that can be used
	 * to validate the output of call function block
	 *
	 * @async
	 * @param {string} ZObjectLabel - Label of the ZObject
	 * @return {void}
	 */
	async setValidationBlock( ZObjectLabel ) {
		/**
		 * Function section of validation block
		 */
		const parentSelector = await this.getValidationBlockSection( 'function' );
		const validationInputSelector = await parentSelector.$( './/input[@placeholder="Select function"]' );
		await InputDropdown.setInputDropdown(
			parentSelector, validationInputSelector, ZObjectLabel );
	}

	/**
	 * Fills the entries in the String equality parameters block
	 *
	 * @param {string} equalityText
	 * @async
	 * @return {void}
	 */
	async setValidationBlockParameters( equalityText ) {
		const resultValidationKeyValueBlock = await this.getValidationBlockSection( 'second string' );
		const inputSelector = await resultValidationKeyValueBlock.$( 'input' );
		await ElementActions.setInput( inputSelector, equalityText );
	}

	// #endregion

	/**
	 * Publish the new test for the ZObject
	 *
	 * @async
	 * @return {void}
	 */
	async publishTest() {
		await ZObjectPublish.publish();
	}
}

module.exports = new TesterPage();
