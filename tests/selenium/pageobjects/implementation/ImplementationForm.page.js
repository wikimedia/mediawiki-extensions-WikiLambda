/*!
 * Implementation Form page object for the WikiLambda browser test suite
 *
 * Contains the locators and actions specific to the implementation form.
 *
 * The form contains the following section
 * [1] About - Input the label, description, alias in different languages for the implementation
 * [2] Function Explorer - Display the details about the function to which implementation belongs
 * [3] Content Block contains the two mode for implementation
 * [a] Composition - Set the function call
 * [b] Code - Select the programming language and write the code in code editor
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

import Page from 'wdio-mediawiki/Page.js';
import AboutBlock from '../../componentobjects/AboutBlock.js';
import ZObjectPublish from '../../componentobjects/ZObjectPublish.js';
import FunctionExplorerBlock from '../../componentobjects/FunctionExplorerBlock.js';
import ContentBlock from '../../componentobjects/ContentBlock.js';
import ElementActions from '../../utils/ElementActions.js';
import InputDropdown from '../../componentobjects/InputDropdown.js';
import i18n from '../../utils/i18n.js';

class ImplementationForm extends Page {

	get contentBlock() {
		return ContentBlock.contentBlock;
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
	 * Get the name of the function for which implementation form is open
	 *
	 * @async
	 * @return {string} - Name of the function
	 */
	async getFunctionExplorerName() {
		const text = await FunctionExplorerBlock.getFunctionExplorerZObjectLookup();
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
		const contentBlock = await this.contentBlock;
		const implementationBlock = contentBlock.$( '[data-testid="implementation-type"]' );
		const implementationTypeLabel = implementationBlock.$( `.//label[span/span/text()="${ implementationType }"]` );
		await ElementActions.doClick( implementationTypeLabel );
	}

	// #region Code block

	/**
	 * Select the programming language
	 *
	 * @async
	 * @param {string} language - "python" or "javascript"
	 * @return {void}
	 */
	async selectProgrammingLanguage( language ) {
		const languageBlock = this.contentBlock.$( '//*[@data-testid="language-dropdown"]' );
		const languageInputSelector = languageBlock;
		await InputDropdown.setSelectOption( languageBlock, languageInputSelector,
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
		const codeBlock = this.contentBlock.$( '[data-testid="ace-code-editor"]' );
		await codeBlock.$( './textarea' ).waitForExist();
		await codeBlock.click();
		await browser.keys( codeInstructions );
	}

	// #endregion

	// #region Composition Block

	get compositionBlock() {
		return this.contentBlock.$( '[data-testid="implementation-content"]' );
	}

	/**
	 * Toggle the composition block
	 *
	 * @async
	 * @return {void}
	 */
	async toggleCompositionBlock() {
		const compositionBlock = await this.compositionBlock;
		const button = compositionBlock.$( '[data-testid="object-to-string-link"]' );
		await ElementActions.doClick( button );
	}

	/**
	 * Declare the Object type: CompositionBlockEntries
	 *
	 * @typedef {Object} FunctionCall
	 * @property {string} functionCallLabel
	 * @property {string} conditionType
	 * @property {string} conditionValue
	 * @property {string} thenType
	 * @property {string} thenValue
	 * @property {string} elseType
	 * @property {string} elseValue
	 *
	 * @typedef {Object} CompositionBlockEntries
	 * @property {FunctionCall} firstFunctionCallEntries
	 * @property {FunctionCall} secondFunctionCallEntries
	 */

	/**
	 * Fill the entries in the composition block.
	 * This function is specific to set the composition block as per
	 * the implementation of "Boolean equality" or "Z844" using "if else".
	 *
	 * [Function call] [If] - First Function Call
	 * [a] condition [Argument reference] [Z844K1]
	 * [b] then [Argument reference] [Z844K2]
	 * [c] else [Function call] [If] - Second Function Call
	 * [c1] condition [Argument reference] [Z844K2]
	 * [c2] then [Boolean] [false]
	 * [c3] else [Boolean] [true]
	 *
	 * @async
	 * @param {CompositionBlockEntries} compositionBlockEntries
	 * @return {void}
	 */
	async setCompositionBlock( compositionBlockEntries ) {
		const { firstFunctionCallEntries, secondFunctionCallEntries } = compositionBlockEntries;

		/**
		 * Set the Function Call Block to "If"
		 */
		const functionBlock = await ContentBlock.getSectionOfContentBlock( 'function', this.compositionBlock );
		await InputDropdown.setLookupOption(
			functionBlock,
			await functionBlock.$( `.//input[@placeholder="${ i18n[ 'wikilambda-function-typeselector-label' ] }"]` ),
			firstFunctionCallEntries.functionCallLabel );

		let secondFunctionCallBlock;

		// #region First Function call

		{
			/**
			 * Set the condition mode to "Argument reference"
			 */
			const conditionBlock = ContentBlock.getSectionOfContentBlock( 'condition', this.compositionBlock );
			await ContentBlock.selectMode( 'condition', firstFunctionCallEntries.conditionType, conditionBlock );

			/**
			 * Set the condition value to "first Boolean"
			 */
			const conditionValueInputBlock = await ContentBlock.getSectionOfContentBlock( 'key id', conditionBlock );
			const conditionValueInput = await conditionValueInputBlock.$( '[role="combobox"]' );
			await InputDropdown.setSelectOption(
				conditionValueInputBlock,
				conditionValueInput,
				firstFunctionCallEntries.conditionValue );

			/**
			 * Set the then mode to "Argument reference"
			 */
			const thenBlock = ContentBlock.getSectionOfContentBlock( 'then', this.compositionBlock );
			await ContentBlock.selectMode( 'then', firstFunctionCallEntries.thenType, thenBlock );

			/**
			 * Set the then value to "second Boolean"
			 */
			const thenValueInputBlock = await ContentBlock.getSectionOfContentBlock( 'key id', thenBlock );
			const thenValueInput = await thenValueInputBlock.$( '[role="combobox"]' );
			await InputDropdown.setSelectOption(
				thenValueInputBlock,
				thenValueInput,
				firstFunctionCallEntries.thenValue );

			/**
			 * Set the else mode to "Function call"
			 */
			const elseBlock = ContentBlock.getSectionOfContentBlock( 'else', this.compositionBlock );
			await ContentBlock.selectMode( 'else', firstFunctionCallEntries.elseType, elseBlock );

			/**
			 * Set the else value to "If"
			 */
			const elseValueInputBlock = await ContentBlock.getSectionOfContentBlock( 'function', elseBlock );
			await InputDropdown.setLookupOption(
				elseValueInputBlock,
				await elseValueInputBlock.$( `.//input[@placeholder="${ i18n[ 'wikilambda-function-typeselector-label' ] }"]` ),
				firstFunctionCallEntries.elseValue );

			secondFunctionCallBlock = await elseBlock;
		}

		// #endregion

		// #region Second Function call

		{
			/**
			 * Set the condition mode to "Argument reference"
			 */
			const conditionBlock = ContentBlock.getSectionOfContentBlock( 'condition', secondFunctionCallBlock );
			await ContentBlock.selectMode( 'condition', secondFunctionCallEntries.conditionType, conditionBlock );

			/**
			 * Set the condition value to "second Boolean"
			 */
			const conditionValueInputBlock = await ContentBlock.getSectionOfContentBlock( 'key id', conditionBlock );
			const conditionValueInput = await conditionValueInputBlock.$( '[role="combobox"]' );
			await InputDropdown.setSelectOption(
				conditionValueInputBlock,
				conditionValueInput,
				secondFunctionCallEntries.conditionValue );

			/**
			 * Set the then type to "Boolean"
			 */
			const thenBlock = ContentBlock.getSectionOfContentBlock( 'then', secondFunctionCallBlock );
			const thenTypeBlock = await ContentBlock.getSectionOfContentBlock( 'type', thenBlock );
			const thenTypeInput = await thenTypeBlock.$( 'input' );
			await InputDropdown.setLookupOption(
				thenTypeBlock,
				thenTypeInput,
				secondFunctionCallEntries.thenType );

			/**
			 * Set the then value to "false"
			 */
			const thenValueBlock = await ContentBlock.getSectionOfContentBlock( 'identity', thenBlock );
			const thenValueInput = await thenValueBlock.$( '[role="combobox"]' );
			await InputDropdown.setSelectOption(
				thenValueBlock,
				thenValueInput,
				secondFunctionCallEntries.thenValue );

			/**
			 * Set the else type to "Boolean"
			 */
			const elseBlock = await ContentBlock.getSectionOfContentBlock( 'else', secondFunctionCallBlock.$( './div[2]' ) );
			const elseTypeBlock = await ContentBlock.getSectionOfContentBlock( 'type', elseBlock );
			const elseTypeInput = await elseTypeBlock.$( 'input' );
			await InputDropdown.setLookupOption(
				elseTypeBlock,
				elseTypeInput,
				secondFunctionCallEntries.elseType );

			/**
			 * Set the else value to "true"
			 */
			const elseValueBlock = await ContentBlock.getSectionOfContentBlock( 'identity', elseBlock );
			const elseValueInput = await elseValueBlock.$( '[role="combobox"]' );
			await InputDropdown.setSelectOption(
				elseValueBlock,
				elseValueInput,
				secondFunctionCallEntries.elseValue );
		}

		// #endregion
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
		const url = await browser.getUrl();
		await ZObjectPublish.publish();
		await browser.waitUntil( async () => {
			const newUrl = await browser.getUrl();
			return url !== newUrl;
		}, { timeout: 10000, timeoutMsg: 'the url has not changed' } );
	}
}

export default new ImplementationForm();
