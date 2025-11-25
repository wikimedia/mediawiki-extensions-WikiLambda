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

import Page from 'wdio-mediawiki/Page.js';
import AboutBlock from '../../componentobjects/AboutBlock.js';
import InputDropdown from '../../componentobjects/InputDropdown.js';
import ElementActions from '../../utils/ElementActions.js';
import ZObjectPublish from '../../componentobjects/ZObjectPublish.js';
import { Element as WebdriverIOElementType } from 'webdriverio';
import ContentBlock from '../../componentobjects/ContentBlock.js';
import FunctionExplorerBlock from '../../componentobjects/FunctionExplorerBlock.js';
import i18n from '../../utils/i18n.js';

class TesterPage extends Page {

	get contentBlock() {
		return ContentBlock.contentBlock;
	}

	get callFunctionBlock() {
		return this.contentBlock.$( '[data-testid="tester-call"]' );
	}

	get validationBlock() {
		return this.contentBlock.$( './/div[@data-testid="tester-validation"]' );
	}

	// #region About Block

	/**
	 * Add a new language block into the About widget
	 * given the new language { zid, name }
	 *
	 * @async
	 * @param {string} language
	 * @return {void}
	 */
	async addAboutBlockLanguage( language ) {
		await AboutBlock.addLanguage( language );
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
		const selectFunctionLink = await $( '[data-testid="tester-call"] [data-testid="expanded-toggle"]' );
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
		const callFunctionBlockInputSelector = await $( `[data-testid="tester-call"] input[placeholder="${ i18n[ 'wikilambda-function-typeselector-label' ] }"][data-testid="z-object-selector-lookup"]` );
		await InputDropdown.setLookupOption(
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
		const conditionInputRadio = await conditionBlock.$( `.//span[contains(text(), "${ condition }")]` );
		await ElementActions.doClick( conditionInputRadio );

		/**
		 * Fills the entries in the then block
		 */
		const thenBlock = await this.getCallFunctionBlockSection( 'then' );
		const thenBlockInputTypeSelector = await thenBlock.$( `.//input[@placeholder="${ i18n[ 'wikilambda-typeselector-label' ] }"]` );
		await InputDropdown.setLookupOption(
			thenBlock, thenBlockInputTypeSelector, thenBlockInputType );
		const thenBlockInputSelector = await thenBlock.$( 'input' );
		await ElementActions.setInput( thenBlockInputSelector, thenBlockInput );

		/**
		 * Fills the entries in the else block
		 */
		const elseBlock = await this.getCallFunctionBlockSection( 'else' );
		const elseBlockInputTypeSelector = await elseBlock.$( `.//input[@placeholder="${ i18n[ 'wikilambda-typeselector-label' ] }"]` );
		await InputDropdown.setLookupOption(
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
		const selectFunctionLink = await $( '[data-testid="tester-validation"] [data-testid="expanded-toggle"]' );
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
		// wikilambda-function-typeselector-label
		const validationInputSelector = await parentSelector.$( `.//input[@placeholder="${ i18n[ 'wikilambda-function-typeselector-label' ] }"]` );
		await InputDropdown.setLookupOption(
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

export default new TesterPage();
