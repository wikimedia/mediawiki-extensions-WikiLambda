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

	// #region Composition Block

	get compositionBlock() { return ContentBlock.getSectionOfContentBlock( 'composition' ); }

	/**
	 * Toggle the composition block
	 *
	 * @async
	 * @return {void}
	 */
	async toggleCompositionBlock() {
		await ContentBlock.toggleSection( 'composition' );
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
	 * @see https://wikifunctions.beta.wmflabs.org/wiki/Z10856
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
		const functionBlock = ContentBlock.getSectionOfContentBlock( 'function', this.compositionBlock );
		await InputDropdown.setInputDropdown( functionBlock, functionBlock.$( './/input[@placeholder="ZObject"]' ),
			firstFunctionCallEntries.functionCallLabel );

		let secondFunctionCallBlock;

		// #region First Function call

		{
			/**
			 * Set the condition type to "Argument reference"
			 */
			const conditionBlock = ContentBlock.getSectionOfContentBlock( 'condition', this.compositionBlock );
			await ContentBlock.toggleSection( 'condition', this.compositionBlock );
			const conditionTypeBlock = ContentBlock.getSectionOfContentBlock( 'type', conditionBlock );
			const conditionTypeInputSelector = conditionTypeBlock.$( './/span[@role="textbox"]' );
			await InputDropdown.setInputDropdownReadOnly( conditionTypeBlock,
				conditionTypeInputSelector, firstFunctionCallEntries.conditionType );

			/**
			 * Set the condition value to "Z844K1"
			 */
			const conditionValueInputBlock = ContentBlock.getSectionOfContentBlock( 'key id', conditionBlock );
			await ElementActions.setInput( conditionValueInputBlock.$( 'input' ), firstFunctionCallEntries.conditionValue );

			/**
			 * Set the then type to "Argument reference"
			 */
			const thenBlock = ContentBlock.getSectionOfContentBlock( 'then', this.compositionBlock );

			/**
			 * Workaround against the Bug: T338011
			 */
			let thenTypeBlock = ContentBlock.getSectionOfContentBlock( 'type', thenBlock );
			await InputDropdown.setInputDropdown( thenTypeBlock, thenTypeBlock.$( 'input' ), 'Boolean' );

			thenTypeBlock = ContentBlock.getSectionOfContentBlock( 'type', thenBlock );
			const thenNestedTypeBlock = ContentBlock.getSectionOfContentBlock( 'type', thenTypeBlock );
			const thenNestedTypeInputSelector = thenNestedTypeBlock.$( './/span[@role="textbox"]' );
			await InputDropdown.setInputDropdownReadOnly( thenNestedTypeBlock,
				thenNestedTypeInputSelector, firstFunctionCallEntries.thenType );

			/**
			 * Set the then value to "Z844K2"
			 */
			const thenValueInputBlock = ContentBlock.getSectionOfContentBlock( 'key id', thenBlock );
			await ElementActions.setInput( thenValueInputBlock.$( 'input' ), firstFunctionCallEntries.thenValue );

			/**
			 * Set the else type to "Function call"
			 */
			const elseBlock = ContentBlock.getSectionOfContentBlock( 'else', this.compositionBlock );

			/**
			 * Workaround against the Bug: T338011
			 */
			let elseTypeBlock = ContentBlock.getSectionOfContentBlock( 'type', elseBlock );
			await InputDropdown.setInputDropdown( elseTypeBlock, elseTypeBlock.$( 'input' ), 'Boolean' );

			elseTypeBlock = ContentBlock.getSectionOfContentBlock( 'type', elseBlock );
			const elseNestedTypeBlock = ContentBlock.getSectionOfContentBlock( 'type', elseTypeBlock );
			const elseNestedTypeInputSelector = elseNestedTypeBlock.$( './/span[@role="textbox"]' );
			await InputDropdown.setInputDropdownReadOnly( elseNestedTypeBlock,
				elseNestedTypeInputSelector, firstFunctionCallEntries.elseType );

			/**
			 * Set the else value to "If"
			 */
			const elseValueInputBlock = ContentBlock.getSectionOfContentBlock( 'function', elseBlock );
			await InputDropdown.setInputDropdown( elseValueInputBlock, elseValueInputBlock.$( 'input' ), firstFunctionCallEntries.elseValue );

			secondFunctionCallBlock = elseBlock;
		}

		// #endregion

		// #region Second Function call

		{
			/**
			 * Set the condition type to "Argument reference"
			 */
			const conditionBlock = ContentBlock.getSectionOfContentBlock( 'condition', secondFunctionCallBlock );
			await ContentBlock.toggleSection( 'condition', secondFunctionCallBlock );
			const conditionTypeBlock = ContentBlock.getSectionOfContentBlock( 'type', conditionBlock );
			const conditionTypeInputSelector = conditionTypeBlock.$( './/span[@role="textbox"]' );
			await InputDropdown.setInputDropdownReadOnly( conditionTypeBlock,
				conditionTypeInputSelector, secondFunctionCallEntries.conditionType );

			/**
			 * Set the condition value to "Z844K2"
			 */
			const conditionValueInputBlock = ContentBlock.getSectionOfContentBlock( 'key id', conditionBlock );
			await ElementActions.setInput( conditionValueInputBlock.$( 'input' ), secondFunctionCallEntries.conditionValue );

			/**
			 * Set the then type to "Boolean"
			 */
			const thenBlock = ContentBlock.getSectionOfContentBlock( 'then', secondFunctionCallBlock );
			await ContentBlock.toggleSection( 'type', thenBlock );
			const thenTypeBlock = ContentBlock.getSectionOfContentBlock( 'type', thenBlock );
			const thenTypeInputBlock = ContentBlock.getSectionOfContentBlock( 'reference id', thenTypeBlock );
			await InputDropdown.setInputDropdown( thenTypeInputBlock, thenTypeInputBlock.$( 'input' ), secondFunctionCallEntries.thenType );

			/**
			 * Set the then value to "false"
			 */
			const thenValueInputBlock = ContentBlock.getSectionOfContentBlock( 'identity', thenBlock );
			await InputDropdown.setInputDropdown( thenValueInputBlock, thenValueInputBlock.$( 'input' ), secondFunctionCallEntries.thenValue );

			/**
			 * Set the else type to "Boolean"
			 */
			const elseBlock = ContentBlock.getSectionOfContentBlock( 'else', secondFunctionCallBlock.$( './div[2]' ) );
			await ContentBlock.toggleSection( 'type', elseBlock );
			const elseTypeBlock = ContentBlock.getSectionOfContentBlock( 'type', elseBlock );
			const elseTypeInputBlock = ContentBlock.getSectionOfContentBlock( 'reference id', elseTypeBlock );
			await InputDropdown.setInputDropdown( elseTypeInputBlock, elseTypeInputBlock.$( 'input' ), secondFunctionCallEntries.elseType );

			/**
			 * Set the else value to "true"
			 */
			const elseValueInputBlock = ContentBlock.getSectionOfContentBlock( 'identity', elseBlock );
			await InputDropdown.setInputDropdown( elseValueInputBlock, elseValueInputBlock.$( 'input' ), secondFunctionCallEntries.elseValue );
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
		await ZObjectPublish.publish();
	}
}

module.exports = new ImplementationForm();
